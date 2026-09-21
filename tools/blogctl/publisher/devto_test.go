package publisher

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func devtoTestInput() DraftInput {
	return DraftInput{
		Slug: "example", Title: "Example", Description: "Description",
		Markdown: "Body\n", ContentHash: "hash-1", Tags: []string{"Go", "Concurrency"},
		CoverImageURL:      "https://thinkerqaq.github.io/media/cover.png",
		NativeCanonicalURL: "https://thinkerqaq.github.io/en/articles/example/",
		Published:          false,
	}
}

func TestDEVToCreateDiscoversCanonicalArticleAndUpdatesInsteadOfDuplicating(t *testing.T) {
	var mu sync.Mutex
	methods := []string{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		methods = append(methods, r.Method+" "+r.URL.Path)
		mu.Unlock()
		if r.Header.Get("api-key") != "secret" {
			http.Error(w, "missing key", http.StatusUnauthorized)
			return
		}
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/api/articles/me/all":
			_ = json.NewEncoder(w).Encode([]devtoArticle{{
				ID: 42, Title: "Example",
				CanonicalURL: "https://thinkerqaq.github.io/en/articles/example/?utm_source=old#fragment",
				URL:          "https://dev.to/thinker/example-42",
			}})
		case r.Method == http.MethodGet && r.URL.Path == "/api/articles/42":
			_ = json.NewEncoder(w).Encode(devtoArticle{
				ID: 42, Title: "Example", Description: "Old", BodyMarkdown: "Old body",
				CanonicalURL: "https://thinkerqaq.github.io/en/articles/example/",
				TagList:      []string{"go"}, URL: "https://dev.to/thinker/example-42",
			})
		case r.Method == http.MethodPut && r.URL.Path == "/api/articles/42":
			var body struct {
				Article devtoPayload `json:"article"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
			if body.Article.BodyMarkdown != "Body\n" || body.Article.Tags != "go,concurrency" {
				t.Fatalf("payload = %#v", body.Article)
			}
			_ = json.NewEncoder(w).Encode(devtoArticle{ID: 42, URL: "https://dev.to/thinker/example-42"})
		default:
			http.Error(w, "unexpected", http.StatusNotFound)
		}
	}))
	defer server.Close()

	adapter, err := newDEVToAdapter(server.Client(), Session{APIKey: "secret"}, server.URL)
	if err != nil {
		t.Fatal(err)
	}
	result, err := adapter.CreateDraft(context.Background(), devtoTestInput())
	if err != nil {
		t.Fatal(err)
	}
	if !result.Updated || result.Created || result.ID != "42" {
		t.Fatalf("result = %#v", result)
	}
	mu.Lock()
	defer mu.Unlock()
	for _, method := range methods {
		if strings.HasPrefix(method, http.MethodPost+" ") {
			t.Fatalf("unexpected duplicate create: %v", methods)
		}
	}
}

func TestDEVToSkipsUnchangedChangedOnlyDraft(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/api/articles/me/all":
			_ = json.NewEncoder(w).Encode([]devtoArticle{{
				ID: 42, Title: "Example", Description: "Description", BodyMarkdown: "Body",
				CanonicalURL: "https://thinkerqaq.github.io/en/articles/example/",
				TagList:      []string{"go", "concurrency"}, URL: "https://dev.to/thinker/example-42",
			}})
		default:
			http.Error(w, "unexpected mutation", http.StatusInternalServerError)
		}
	}))
	defer server.Close()

	adapter, err := newDEVToAdapter(server.Client(), Session{APIKey: "secret"}, server.URL)
	if err != nil {
		t.Fatal(err)
	}
	input := devtoTestInput()
	input.ChangedOnly = true
	result, err := adapter.CreateDraft(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	if !result.Skipped || requests != 1 {
		t.Fatalf("result = %#v requests=%d", result, requests)
	}
}

func TestDEVToCreatesWhenCanonicalDoesNotExist(t *testing.T) {
	posted := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/api/articles/me/all":
			_ = json.NewEncoder(w).Encode([]devtoArticle{})
		case r.Method == http.MethodPost && r.URL.Path == "/api/articles":
			posted = true
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(devtoArticle{ID: 99, URL: "https://dev.to/thinker/example-99"})
		default:
			http.Error(w, "unexpected", http.StatusNotFound)
		}
	}))
	defer server.Close()

	adapter, _ := newDEVToAdapter(server.Client(), Session{APIKey: "secret"}, server.URL)
	result, err := adapter.CreateDraft(context.Background(), devtoTestInput())
	if err != nil {
		t.Fatal(err)
	}
	if !posted || !result.Created || result.ID != "99" {
		t.Fatalf("result = %#v posted=%v", result, posted)
	}
}
