package publisher

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return fn(request)
}

func jsonResponse(request *http.Request, status int, body string, headers map[string]string) *http.Response {
	header := make(http.Header)
	header.Set("content-type", "application/json")
	for name, value := range headers {
		header.Set(name, value)
	}
	return &http.Response{
		StatusCode: status,
		Header:     header,
		Body:       io.NopCloser(strings.NewReader(body)),
		Request:    request,
	}
}

func juejinSession() Session {
	expiry := float64(time.Now().Add(time.Hour).Unix())
	return Session{
		UserAgent: "BlogCTL-Test-UA",
		Cookies: []BrowserCookie{{
			Name: "sessionid", Value: "secret-session", Domain: ".juejin.cn", Path: "/",
			Secure: true, HTTPOnly: true, ExpirationDate: &expiry,
		}},
	}
}

func TestJuejinCreateDraftUsesBrowserSessionAndCSRF(t *testing.T) {
	var createBody map[string]any
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/user_api/v1/user/get":
			if !strings.Contains(request.Header.Get("cookie"), "sessionid=secret-session") {
				t.Fatalf("auth cookie = %q", request.Header.Get("cookie"))
			}
			return jsonResponse(request, 200, `{"data":{"user_id":"u1","user_name":"tester"}}`, nil), nil
		case "/user_api/v1/sys/token":
			if request.Method != http.MethodHead {
				t.Fatalf("csrf method = %s", request.Method)
			}
			return jsonResponse(request, 200, "", map[string]string{
				"x-ware-csrf-token": "0,csrf-value,86370000,success,session",
			}), nil
		case "/content_api/v1/article_draft/create":
			if request.Method != http.MethodPost {
				t.Fatalf("create method = %s", request.Method)
			}
			if request.Header.Get("origin") != juejinOrigin || request.Header.Get("referer") != juejinOrigin+"/" {
				t.Fatalf("origin/referer = %q / %q", request.Header.Get("origin"), request.Header.Get("referer"))
			}
			if request.Header.Get("x-secsdk-csrf-token") != "csrf-value" {
				t.Fatalf("csrf header = %q", request.Header.Get("x-secsdk-csrf-token"))
			}
			if err := json.NewDecoder(request.Body).Decode(&createBody); err != nil {
				t.Fatal(err)
			}
			return jsonResponse(request, 200, `{"err_no":0,"data":{"id":"draft-123"}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	adapter, err := NewJuejinAdapter(client, juejinSession())
	if err != nil {
		t.Fatal(err)
	}
	auth, err := adapter.CheckAuth(context.Background())
	if err != nil || !auth.Authenticated || auth.UserID != "u1" {
		t.Fatalf("auth = %#v, err = %v", auth, err)
	}
	result, err := adapter.CreateDraft(context.Background(), DraftInput{
		Title: "Title", Description: "Description", Markdown: "# Body",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != "draft-123" || result.URL != "https://juejin.cn/editor/drafts/draft-123" || !result.Created {
		t.Fatalf("result = %#v", result)
	}
	if createBody["title"] != "Title" || createBody["mark_content"] != "# Body" || createBody["edit_type"] != float64(10) {
		t.Fatalf("create body = %#v", createBody)
	}
}

func TestJuejinUpdateDraftReusesRemoteID(t *testing.T) {
	var updateBody map[string]any
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/user_api/v1/sys/token":
			return jsonResponse(request, 200, "", map[string]string{"x-ware-csrf-token": "0,csrf,1,success,x"}), nil
		case "/content_api/v1/article_draft/update":
			if err := json.NewDecoder(request.Body).Decode(&updateBody); err != nil {
				t.Fatal(err)
			}
			return jsonResponse(request, 200, `{"err_no":0,"data":{}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s", request.URL.String())
			return nil, nil
		}
	})}
	adapter, err := NewJuejinAdapter(client, juejinSession())
	if err != nil {
		t.Fatal(err)
	}
	result, err := adapter.UpdateDraft(context.Background(), DraftRef{ID: "existing"}, DraftInput{
		Title: "Updated", Description: "Summary", Markdown: "Body",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !result.Updated || result.ID != "existing" {
		t.Fatalf("result = %#v", result)
	}
	if updateBody["id"] != "existing" {
		t.Fatalf("update body = %#v", updateBody)
	}
}

func TestJuejinImageUploadRewritesMarkdown(t *testing.T) {
	calls := []string{}
	var createBody map[string]any
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		calls = append(calls, request.Method+" "+request.URL.Host+request.URL.Path+"?"+request.URL.RawQuery)
		switch {
		case request.URL.Path == "/user_api/v1/sys/token":
			return jsonResponse(request, 200, "", map[string]string{"x-ware-csrf-token": "0,csrf,1,success,x"}), nil
		case request.URL.Path == "/imagex/v2/gen_token":
			return jsonResponse(request, 200, `{"err_no":0,"data":{"token":{"AccessKeyId":"ak","SecretAccessKey":"sk","SessionToken":"st","ExpiredTime":"2030-01-01T00:00:00Z"}}}`, nil), nil
		case request.URL.Host == "imagex.bytedanceapi.com" && request.URL.Query().Get("Action") == "ApplyImageUpload":
			if !strings.HasPrefix(request.Header.Get("authorization"), "AWS4-HMAC-SHA256 ") {
				t.Fatalf("apply authorization = %q", request.Header.Get("authorization"))
			}
			return jsonResponse(request, 200, `{"Result":{"UploadAddress":{"StoreInfos":[{"StoreUri":"store/image.png","Auth":"tos-auth","UploadID":"u"}],"UploadHosts":["upload.example.com"],"SessionKey":"session-key"}}}`, nil), nil
		case request.URL.Host == "upload.example.com" && request.Method == http.MethodPut:
			if request.Header.Get("authorization") != "tos-auth" {
				t.Fatalf("TOS auth = %q", request.Header.Get("authorization"))
			}
			if request.Header.Get("content-crc32") == "" {
				t.Fatal("Content-CRC32 is missing")
			}
			return jsonResponse(request, 200, "", nil), nil
		case request.URL.Host == "imagex.bytedanceapi.com" && request.URL.Query().Get("Action") == "CommitImageUpload":
			return jsonResponse(request, 200, `{"Result":{"RequestId":"ok"}}`, nil), nil
		case request.URL.Path == "/imagex/v2/get_img_url":
			return jsonResponse(request, 200, `{"err_no":0,"data":{"main_url":"https://p3-juejin.byteimg.com/native.png"}}`, nil), nil
		case request.URL.Path == "/content_api/v1/article_draft/create":
			if err := json.NewDecoder(request.Body).Decode(&createBody); err != nil {
				t.Fatal(err)
			}
			return jsonResponse(request, 200, `{"err_no":0,"data":{"id":"with-image"}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s", request.URL.String())
			return nil, nil
		}
	})}
	adapter, err := NewJuejinAdapter(client, juejinSession())
	if err != nil {
		t.Fatal(err)
	}
	result, err := adapter.CreateDraft(context.Background(), DraftInput{
		Title: "Image", Description: "Image article",
		Markdown: "![x](data:image/png;base64,aGVsbG8=)",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != "with-image" {
		t.Fatalf("result = %#v", result)
	}
	markdown, _ := createBody["mark_content"].(string)
	if markdown != "![x](https://p3-juejin.byteimg.com/native.png)" {
		t.Fatalf("markdown = %q", markdown)
	}
	if len(calls) < 6 {
		t.Fatalf("calls = %#v", calls)
	}
}

func TestServiceRecreatesMissingRemoteDraftExactlyOnce(t *testing.T) {
	root := t.TempDir()
	output := filepath.Join(root, ".distribution", "juejin")
	if err := os.MkdirAll(output, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(output, "example.md"), []byte("---\ntitle: \"Example\"\ndescription: \"Desc\"\n---\n\nChanged body\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	manifest := map[string]any{
		"version": 2,
		"articles": map[string]any{
			"example": map[string]any{"platforms": map[string]any{
				"juejin": map[string]any{
					"contentHash": "new", "draftHash": "old",
					"remoteDraftId": "missing", "draftUrl": "https://juejin.cn/editor/drafts/missing",
					"language": "zh-CN",
				},
			}},
		},
	}
	payload, _ := json.Marshal(manifest)
	if err := os.WriteFile(filepath.Join(root, ".distribution", "manifest.json"), payload, 0o600); err != nil {
		t.Fatal(err)
	}

	updateCalls := 0
	createCalls := 0
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/user_api/v1/user/get":
			return jsonResponse(request, 200, `{"data":{"user_id":"u1"}}`, nil), nil
		case "/user_api/v1/sys/token":
			return jsonResponse(request, 200, "", map[string]string{
				"x-ware-csrf-token": "0,csrf,1,success,x",
			}), nil
		case "/content_api/v1/article_draft/update":
			updateCalls++
			return jsonResponse(request, http.StatusNotFound, `{"err_no":404,"err_msg":"draft not found"}`, nil), nil
		case "/content_api/v1/article_draft/create":
			createCalls++
			return jsonResponse(request, 200, `{"err_no":0,"data":{"id":"replacement"}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s", request.URL.String())
			return nil, nil
		}
	})}

	service := Service{
		HTTPClient: client,
		Now: func() time.Time { return time.Date(2026, 9, 18, 5, 0, 0, 0, time.UTC) },
	}
	result, err := service.CreateOrUpdateDraft(context.Background(), "juejin", juejinSession(), root, "example", true)
	if err != nil {
		t.Fatal(err)
	}
	if updateCalls != 1 || createCalls != 1 {
		t.Fatalf("update/create calls = %d/%d", updateCalls, createCalls)
	}
	if result.ID != "replacement" || !result.Created {
		t.Fatalf("result = %#v", result)
	}

	rawManifest, err := os.ReadFile(filepath.Join(root, ".distribution", "manifest.json"))
	if err != nil {
		t.Fatal(err)
	}
	var saved map[string]any
	if err := json.Unmarshal(rawManifest, &saved); err != nil {
		t.Fatal(err)
	}
	state := objectValue(objectValue(objectValue(saved["articles"])["example"])["platforms"])["juejin"]
	savedState := objectValue(state)
	if stringValue(savedState["remoteDraftId"]) != "replacement" || stringValue(savedState["draftHash"]) != "new" {
		t.Fatalf("saved state = %#v", savedState)
	}
}

func TestServiceSkipsUnchangedDraftWithoutNetwork(t *testing.T) {
	root := t.TempDir()
	output := filepath.Join(root, ".distribution", "juejin")
	if err := os.MkdirAll(output, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(output, "example.md"), []byte("---\ntitle: \"Example\"\ndescription: \"Desc\"\n---\n\nBody\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	manifest := map[string]any{
		"version": 2,
		"articles": map[string]any{
			"example": map[string]any{"platforms": map[string]any{
				"juejin": map[string]any{
					"contentHash": "same", "draftHash": "same",
					"remoteDraftId": "draft-1", "draftUrl": "https://juejin.cn/editor/drafts/draft-1",
					"language": "zh-CN",
				},
			}},
		},
	}
	payload, _ := json.Marshal(manifest)
	if err := os.WriteFile(filepath.Join(root, ".distribution", "manifest.json"), payload, 0o600); err != nil {
		t.Fatal(err)
	}
	service := Service{HTTPClient: &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		t.Fatalf("network should not run: %s", request.URL)
		return nil, nil
	})}}
	result, err := service.CreateOrUpdateDraft(context.Background(), "juejin", juejinSession(), root, "example", true)
	if err != nil {
		t.Fatal(err)
	}
	if !result.Skipped || result.ID != "draft-1" {
		t.Fatalf("result = %#v", result)
	}
}

func TestCRC32AndAWS4AreDeterministic(t *testing.T) {
	if got := CRC32Hex([]byte("123456789")); got != "cbf43926" {
		t.Fatalf("CRC32 = %s", got)
	}
	headers, err := SignAWS4("GET", "https://imagex.bytedanceapi.com/?Version=2018-08-01&Action=ApplyImageUpload", AWS4Credentials{
		AccessKeyID: "ak", SecretAccessKey: "sk", SecurityToken: "token",
		Region: "cn-north-1", Service: "imagex",
	}, time.Date(2026, 9, 18, 4, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	if headers["x-amz-date"] != "20260918T040000Z" || headers["x-amz-security-token"] != "token" {
		t.Fatalf("headers = %#v", headers)
	}
	if !strings.Contains(headers["authorization"], "Credential=ak/20260918/cn-north-1/imagex/aws4_request") {
		t.Fatalf("authorization = %q", headers["authorization"])
	}
}
