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
	Cookies              []BrowserCookie
	UserAgent            string
	RequestCookieHeader  string
	RequestCookieHeaders map[string]string
	CookieHostSuffixes   []string
	APIKey               string
}

type AuthResult struct {
	Authenticated bool
	UserID        string
	Username      string
}

type PublishingAsset struct {
	Kind      string
	ID        string
	ObjectKey string
	PublicURL string
	Source    string
}

type R2FallbackConfig struct {
	AccessKeyID     string
	SecretAccessKey string
	AccountID       string
	Endpoint        string
	Bucket          string
	PublicBaseURL   string
}

type DraftInput struct {
	Slug               string
	Title              string
	Description        string
	Markdown           string
	HTML               string
	Language           string
	ContentHash        string
	DraftHash          string
	RemoteDraftID      string
	DraftURL           string
	SourceDir          string
	Tags               []string
	CoverImageURL      string
	NativeCanonicalURL string
	Published          bool
	ChangedOnly        bool
	ContentRoot        string
	Assets             []PublishingAsset
	R2Fallback         R2FallbackConfig
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
	ID  string
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
