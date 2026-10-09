package publisher

import (
	"context"
	"net/http"
	"path/filepath"
	"testing"
)

func TestToutiaoNoBindingCreatesDraftInsteadOfUpdatingPublished(t *testing.T) {
	const slug = "concurrency-series-06-atomic-implementation"
	const draftID = "7694632080231186986"
	path := filepath.Join(t.TempDir(), "publications.json")
	writes := 0
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		switch r.URL.Path {
		case "/mp/agw/media/get_media_info":
			return jsonResponse(r, 200, `{"data":{"user":{"id":"author-1"}}}`, nil), nil
		case "/mp/agw/article/publish":
			writes++
			if err := r.ParseForm(); err != nil {
				t.Fatal(err)
			}
			if r.PostForm.Get("save") != "0" || r.PostForm.Has("pgc_id") {
				t.Fatalf("new unbound article must use save=0 and no pgc_id: %v", r.PostForm)
			}
			if r.PostForm.Get("article_ad_type") != "3" || r.PostForm.Get("customer_nick_name") != "" ||
				r.PostForm.Get("source") != "29" {
				t.Fatal("new draft form does not match HAR")
			}
			return jsonResponse(r, 200, `{"code":0,"err_no":0,"message":"保存成功","data":{"pgc_id":"7694632080231186986"}}`, nil), nil
		default:
			t.Fatalf("unexpected request %s", r.URL)
			return nil, nil
		}
	})}
	service := Service{HTTPClient: client, PublicationPath: path}
	result, err := service.CreateOrUpdateDraftInput(context.Background(), "toutiao", toutiaoTestSession(), "", DraftInput{
		Slug: slug, Title: "第六篇", Markdown: "正文", ContentHash: "hash-1",
	}, false)
	if err != nil || !result.Created || result.ID != draftID || writes != 1 {
		t.Fatalf("expected new draft: result=%+v, writes=%d, err=%v", result, writes, err)
	}
	binding, found, err := LoadPublicationBinding(path, slug, "toutiao")
	if err != nil || !found || binding.RemoteDraftID != draftID || binding.PublishedRemoteID != "" {
		t.Fatalf("incorrect persisted draft binding: found=%t, binding=%+v, err=%v", found, binding, err)
	}
}
