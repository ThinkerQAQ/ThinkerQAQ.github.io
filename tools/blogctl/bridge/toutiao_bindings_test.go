package bridge

import (
	"testing"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/publisher"
)

func TestToutiaoBindingStateSeparatesDraftFromPublished(t *testing.T) {
	binding := publisher.PublicationBinding{
		RemoteDraftID: "100", PublishedRemoteID: "200",
		DraftURL:     "https://mp.toutiao.com/profile_v4/graphic/publish?pgc_id=100",
		PublishedURL: "https://www.toutiao.com/article/200/",
	}
	tests := []struct {
		post  publisher.ToutiaoPost
		bound bool
		state string
	}{
		{publisher.ToutiaoPost{ID: "100"}, true, "draft"},
		{publisher.ToutiaoPost{ID: "200", Published: true}, true, "published"},
		{publisher.ToutiaoPost{ID: "100", Published: true}, false, ""},
		{publisher.ToutiaoPost{ID: "200"}, false, ""},
	}
	for _, tt := range tests {
		bound, state := toutiaoBindingState(binding, tt.post)
		if bound != tt.bound || state != tt.state {
			t.Fatalf("post=%+v bound=%v state=%s", tt.post, bound, state)
		}
	}
	views := toutiaoBindingViews(binding)
	if len(views) != 2 || views[0].State != "draft" || views[1].State != "published" {
		t.Fatalf("binding views=%+v", views)
	}
}
