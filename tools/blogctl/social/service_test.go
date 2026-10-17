package social

import (
	"context"
	"errors"
	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/social/buffer"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type fakeBuffer struct {
	posts              map[string]buffer.RemotePost
	fail               bool
	creates, publishes int
}

func (f *fakeBuffer) Channels(context.Context) ([]buffer.Channel, error) {
	return []buffer.Channel{{ID: "channel", Service: "linkedin", DisplayName: "scott zhang"}}, nil
}
func (f *fakeBuffer) Post(_ context.Context, id string) (buffer.RemotePost, error) {
	return f.posts[id], nil
}
func (f *fakeBuffer) CreateDraft(_ context.Context, p buffer.PostPayload) (buffer.RemotePost, error) {
	f.creates++
	if f.fail {
		return buffer.RemotePost{}, errors.New("simulated network timeout")
	}
	post := buffer.RemotePost{ID: "post1", ChannelID: p.ChannelID, Text: p.Text, Status: "draft"}
	f.posts[post.ID] = post
	return post, nil
}
func (f *fakeBuffer) PublishDraft(_ context.Context, id string) (buffer.RemotePost, error) {
	f.publishes++
	result := f.posts[id]
	result.Status = "sent"
	f.posts[id] = result
	return result, nil
}
func sampleDraft(t *testing.T, dir string) Draft {
	t.Helper()
	draft, err := Create(dir, DraftInput{ID: "mutex-demo", Source: Source{Kind: "article", Slug: "mutex", Language: "en", URL: "https://thinkerqaq.com/en/articles/mutex/"}, Posts: map[string]Post{"linkedin": {Text: "A lock is more than mutual exclusion."}}})
	if err != nil {
		t.Fatal(err)
	}
	return draft
}
func TestApprovalStagePublish(t *testing.T) {
	dir := t.TempDir()
	draft := sampleDraft(t, dir)
	mock := &fakeBuffer{posts: map[string]buffer.RemotePost{}}
	service := Service{DataRoot: dir, Buffer: mock}
	if _, err := service.Stage(context.Background(), draft.ID, "linkedin", draft.Revision); err == nil {
		t.Fatal("staged without approval")
	}
	draft.ApprovedRevision = draft.Revision
	if err := Save(dir, draft); err != nil {
		t.Fatal(err)
	}
	staged, err := service.Stage(context.Background(), draft.ID, "linkedin", draft.Revision)
	if err != nil {
		t.Fatal(err)
	}
	if staged.Remote["linkedin"].State != "draft" || mock.creates != 1 {
		t.Fatalf("%+v creates=%d", staged.Remote, mock.creates)
	}
	if _, err := service.Stage(context.Background(), draft.ID, "linkedin", draft.Revision); err == nil {
		t.Fatal("duplicate stage allowed")
	}
	mock.posts["post1"] = buffer.RemotePost{ID: "post1", Status: "draft", ChannelID: "channel", Text: "different"}
	if _, err := service.Publish(context.Background(), draft.ID, "linkedin", draft.Revision); err == nil {
		t.Fatal("published tampered content")
	}
	mock.posts["post1"] = buffer.RemotePost{ID: "post1", Status: "draft", ChannelID: "channel", Text: RenderText(draft.Source.URL, "linkedin", draft.Posts["linkedin"])}
	result, err := service.Publish(context.Background(), draft.ID, "linkedin", draft.Revision)
	if err != nil {
		t.Fatal(err)
	}
	if result.Remote["linkedin"].State != "sent" || mock.publishes != 1 {
		t.Fatal("did not publish")
	}
	if _, err := service.Publish(context.Background(), draft.ID, "linkedin", draft.Revision); err == nil {
		t.Fatal("duplicate publish allowed")
	}
}
func TestAmbiguousCreateNeverRetried(t *testing.T) {
	dir := t.TempDir()
	d := sampleDraft(t, dir)
	d.ApprovedRevision = d.Revision
	if err := Save(dir, d); err != nil {
		t.Fatal(err)
	}
	mock := &fakeBuffer{posts: map[string]buffer.RemotePost{}, fail: true}
	svc := Service{DataRoot: dir, Buffer: mock}
	_, err := svc.Stage(context.Background(), d.ID, "linkedin", d.Revision)
	if err == nil || !strings.Contains(err.Error(), "uncertain") {
		t.Fatal("ambiguous error missing")
	}
	if _, err := svc.Stage(context.Background(), d.ID, "linkedin", d.Revision); err == nil {
		t.Fatal("ambiguous creation retried")
	}
	if mock.creates != 1 {
		t.Fatal("unexpected duplicate remote write")
	}
}
func TestSourceAndStore(t *testing.T) {
	content := t.TempDir()
	root := filepath.Join(content, "src/content/articles/en")
	if err := os.MkdirAll(root, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "demo.md"), []byte("---\nstatus: published\n---\nHello"), 0600); err != nil {
		t.Fatal(err)
	}
	resolved, err := ResolveSource(content, "https://thinkerqaq.com", Source{Kind: "article", Slug: "demo", Language: "en"})
	if err != nil {
		t.Fatal(err)
	}
	if resolved.URL != "https://thinkerqaq.com/en/articles/demo/" {
		t.Fatal(resolved.URL)
	}
	if _, err := ResolveSource(content, "https://thinkerqaq.com", Source{Kind: "article", Slug: "../secret", Language: "en"}); err == nil {
		t.Fatal("path traversal accepted")
	}
	d := sampleDraft(t, t.TempDir())
	if _, err := SafeFile("/tmp", "../secret"); err == nil {
		t.Fatal("unsafe filename")
	}
	if d.Revision != d.Hash() {
		t.Fatal("revision mismatch")
	}
}
