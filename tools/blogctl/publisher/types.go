package publisher

import (
	"context"
	"net/http"
)

type BrowserCookie struct {
	Name           string
	Value          string
	Domain         string
	Path           string
	Secure         bool
	HTTPOnly       bool
	HostOnly       bool
	SameSite       string
	ExpirationDate *float64
}

type Session struct {
	Cookies   []BrowserCookie
	UserAgent string
}

type AuthResult struct {
	Authenticated bool
	UserID        string
	Username      string
}

type DraftInput struct {
	Slug          string
	Title         string
	Description   string
	Markdown      string
	HTML          string
	Language      string
	ContentHash   string
	DraftHash     string
	RemoteDraftID string
	DraftURL      string
	SourceDir     string
}

type DraftRef struct {
	ID  string
	URL string
}

type DraftResult struct {
	ID      string
	URL     string
	Created bool
	Updated bool
	Skipped bool
}

type PublishResult struct {
	URL string
}

type Adapter interface {
	ID() string
	CheckAuth(ctx context.Context) (AuthResult, error)
	CreateDraft(ctx context.Context, input DraftInput) (DraftResult, error)
	UpdateDraft(ctx context.Context, ref DraftRef, input DraftInput) (DraftResult, error)
	PublishDraft(ctx context.Context, ref DraftRef, input DraftInput) (PublishResult, error)
}

type ClientFactory func(base *http.Client, session Session) (Adapter, error)
