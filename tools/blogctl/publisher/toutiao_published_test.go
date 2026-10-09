package publisher

import (
	"context"
	"net/http"
	"path/filepath"
	"strings"
	"testing"
)

func TestToutiaoUpdatePublishedRepublishesExactCreatorArticle(t *testing.T) {
	const articleID = "7693887351981883947"
	path := filepath.Join(t.TempDir(), "publications.json")
	if err := SavePublicationBinding(path, PublicationBinding{
		Slug: "concurrency-03", Platform: "toutiao",
		PublishedRemoteID: articleID, PublishedURL: "https://www.toutiao.com/article/" + articleID + "/",
		Account: "creator-1", RemoteUpdatedAt: "1791545110", Source: "manual",
	}); err != nil {
		t.Fatal(err)
	}
	submitted := 0
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		switch r.URL.Path {
		case "/mp/agw/media/get_media_info":
			return jsonResponse(r, 200, `{"code":0,"data":{"user":{"id":"creator-1"}}}`, nil), nil
		case "/mp/agw/creator_center/list/v2":
			return jsonResponse(r, 200, `{"code":0,"has_more":false,"contents":[{"article_attr":{"gid":"7693887351981883947","title":"并发教程","status":2,"modify_time":1791545110}}]}`, nil), nil
		case "/mp/agw/article/publish":
			submitted++
			if err := r.ParseForm(); err != nil {
				t.Fatal(err)
			}
			form := r.PostForm
			if form.Get("save") != "1" || form.Get("pgc_id") != articleID || form.Get("article_type") != "0" || form.Get("entrance") != "main" {
				t.Fatalf("published edit form does not match HAR: save=%q id=%q article_type=%q entrance=%q", form.Get("save"), form.Get("pgc_id"), form.Get("article_type"), form.Get("entrance"))
			}
			if form.Get("draft_form_data") != `{"coverType":1}` || !strings.Contains(form.Get("extra"), `"source_type":-1`) {
				t.Fatal("republish metadata does not match HAR")
			}
			if form.Get("title") != "新的文章标题" || !strings.Contains(form.Get("content"), "更新后的正文") {
				t.Fatal("local update content missing")
			}
			if r.URL.Query().Get("aid") != "1231" {
				t.Fatal("missing publisher account application id")
			}
			return jsonResponse(r, 200, `{"code":0,"err_no":0,"message":"提交成功","data":{"pgc_id":"7693887351981883947"}}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s", r.URL)
			return nil, nil
		}
	})}
	result, skipped, err := (Service{HTTPClient: client, PublicationPath: path}).UpdateToutiaoPublishedInput(context.Background(), toutiaoTestSession(), "", DraftInput{
		Slug: "concurrency-03", Title: "新的文章标题", Markdown: "更新后的正文", ContentHash: "hash-new",
	})
	if err != nil || skipped || result.ID != articleID || submitted != 1 {
		t.Fatalf("result=%+v skipped=%v calls=%d err=%v", result, skipped, submitted, err)
	}
	binding, _, err := LoadPublicationBinding(path, "concurrency-03", "toutiao")
	if err != nil {
		t.Fatal(err)
	}
	if binding.PublishedRemoteID != articleID || binding.PublishedHash != "hash-new" || binding.RemoteUpdatedAt != "" {
		t.Fatalf("binding changed incorrectly after submission: %+v", binding)
	}
	if binding.RemoteDraftID != "" {
		t.Fatal("republishing must not create a draft binding")
	}
}

func TestToutiaoUpdatePublishedRejectsMismatchedBaselineAndAccount(t *testing.T) {
	for _, tc := range []struct{ name, account, modified string }{
		{"stale revision", "creator-1", "old"},
		{"different account", "another-creator", "1791545110"},
		{"missing baseline", "creator-1", ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "publications.json")
			err := SavePublicationBinding(path, PublicationBinding{
				Slug: "article", Platform: "toutiao", PublishedRemoteID: "777", PublishedURL: "https://www.toutiao.com/article/777/",
				Account: tc.account, RemoteUpdatedAt: tc.modified,
			})
			if err != nil {
				t.Fatal(err)
			}
			requests := 0
			client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				switch r.URL.Path {
				case "/mp/agw/media/get_media_info":
					return jsonResponse(r, 200, `{"code":0,"data":{"user":{"id":"creator-1"}}}`, nil), nil
				case "/mp/agw/creator_center/list/v2":
					return jsonResponse(r, 200, `{"code":0,"contents":[{"article_attr":{"gid":"777","title":"old","status":2,"modify_time":1791545110}}]}`, nil), nil
				case "/mp/agw/article/publish":
					requests++
					t.Fatal("unsafe republish attempt")
					return nil, nil
				default:
					t.Fatalf("unexpected request: %s", r.URL)
					return nil, nil
				}
			})}
			_, _, err = (Service{HTTPClient: client, PublicationPath: path}).UpdateToutiaoPublishedInput(context.Background(), toutiaoTestSession(), "", DraftInput{Slug: "article", Title: "new", Markdown: "new", ContentHash: "new"})
			if err == nil || !IsKind(err, ErrValidation) || requests != 0 {
				t.Fatalf("expected rejection err=%v requests=%d", err, requests)
			}
		})
	}
}

func TestToutiaoUpdatePublishedCannotBecomeDraftSave(t *testing.T) {
	published := PublicationState{PublishedRemoteID: "777", PublishedURL: "https://www.toutiao.com/article/777/"}
	if mayRecreateMissingDraft("toutiao", published) {
		t.Fatal("missing draft must not silently recreate a published article")
	}
	if v := toutiaoArticleValues(DraftInput{Title: "hello"}, "<p>body</p>", "777", "", false); v.Get("save") != "0" {
		t.Fatal("draft mutation must keep save=0")
	}
	if v := toutiaoArticleValues(DraftInput{Title: "hello"}, "<p>body</p>", "777", "", true); v.Get("save") != "1" {
		t.Fatal("explicit publish must keep save=1")
	}
}
