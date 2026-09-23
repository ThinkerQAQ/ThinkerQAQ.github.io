package publisher

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestTransformZhihuHTMLNormalizesTablesCodeAndImages(t *testing.T) {
	input := strings.Join([]string{
		`<table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>x</td><td>1</td></tr></tbody></table>`,
		`<pre><code class="language-go">count++</code></pre>`,
		`<p><img src="https://example.com/image.png" style="width: 10px" data-foo="bar"></p>`,
	}, "")
	got := transformZhihuHTML(input)

	if !strings.Contains(got, `<table data-draft-node="block" data-draft-type="table" data-size="normal" data-row-style="normal"><tbody>`) {
		t.Fatalf("table was not normalized: %s", got)
	}
	if strings.Contains(got, "<thead") {
		t.Fatalf("thead should be folded into tbody: %s", got)
	}
	if !strings.Contains(got, `<pre lang="go"><code>count++</code></pre>`) {
		t.Fatalf("code block was not normalized: %s", got)
	}
	if !strings.Contains(got, `<figure><img src="https://example.com/image.png"></figure>`) {
		t.Fatalf("image was not normalized: %s", got)
	}
	if strings.Contains(got, `style="width`) || strings.Contains(got, "data-foo=") {
		t.Fatalf("unsupported attributes were not removed: %s", got)
	}
	if !strings.Contains(got, "data-draft-node=") {
		t.Fatalf("Draft.js attributes were removed: %s", got)
	}
}

func TestTransformZhihuHTMLKeepsDraftTableAttributes(t *testing.T) {
	input := `<table data-draft-node="block" data-draft-type="table"><tbody><tr><td>a</td></tr></tbody></table>`
	got := transformZhihuHTML(input)
	for _, attribute := range []string{
		`data-draft-node="block"`,
		`data-draft-type="table"`,
		`data-size="normal"`,
		`data-row-style="normal"`,
	} {
		if !strings.Contains(got, attribute) {
			t.Fatalf("draft table attribute %q was lost: %s", attribute, got)
		}
	}
}

func TestZhihuCreateDraftMatchesCapturedPayload(t *testing.T) {
	var createPayload map[string]any
	var updatePayload map[string]any
	client := &http.Client{Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
		switch request.URL.Path {
		case "/api/articles/drafts":
			if err := json.NewDecoder(request.Body).Decode(&createPayload); err != nil {
				t.Fatal(err)
			}
			return jsonResponse(request, 200, `{"id":"2086065787769562759"}`, nil), nil
		case "/api/articles/2086065787769562759/draft":
			if err := json.NewDecoder(request.Body).Decode(&updatePayload); err != nil {
				t.Fatal(err)
			}
			return jsonResponse(request, 200, `{}`, nil), nil
		default:
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.String())
			return nil, nil
		}
	})}

	adapter, err := NewZhihuAdapter(client, Session{UserAgent: "BlogCTL-Test-UA"})
	if err != nil {
		t.Fatal(err)
	}
	result, err := adapter.CreateDraft(context.Background(), DraftInput{
		Title: "test", HTML: "<p>teset</p>",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.ID != "2086065787769562759" || !result.Created {
		t.Fatalf("result = %#v", result)
	}
	if createPayload["title"] != "test" || valueString(createPayload["delta_time"]) != "0" || createPayload["can_reward"] != false {
		t.Fatalf("create payload = %#v", createPayload)
	}
	if _, exists := updatePayload["title"]; exists {
		t.Fatalf("update payload unexpectedly contains title: %#v", updatePayload)
	}
	if updatePayload["content"] != "<p>teset</p>" || updatePayload["table_of_contents"] != false || updatePayload["can_reward"] != false {
		t.Fatalf("update payload = %#v", updatePayload)
	}
}
