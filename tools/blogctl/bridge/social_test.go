package bridge

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSocialAPIRequiresBridgeTokenEvenForDraftListing(t *testing.T) {
	t.Setenv("BLOGCTL_DATA_DIR", t.TempDir())
	s := &Server{token: "test-token"}
	for _, tc := range []struct {
		path, token string
		want        int
	}{
		{"/v1/social/drafts", "", http.StatusUnauthorized},
		{"/v1/social/drafts", "wrong", http.StatusUnauthorized},
		{"/v1/social/drafts", "test-token", http.StatusOK},
		{"/v1/social/drafts/../bad", "test-token", http.StatusBadRequest},
	} {
		r := httptest.NewRequest(http.MethodGet, tc.path, nil)
		if tc.token != "" {
			r.Header.Set("x-thinkerqaq-token", tc.token)
		}
		w := httptest.NewRecorder()
		s.handleSocial(w, r, strings.Split(strings.Trim(tc.path, "/"), "/"))
		if w.Code != tc.want {
			t.Fatalf("%s token=%q: got %d want %d: %s", tc.path, tc.token, w.Code, tc.want, w.Body.String())
		}
	}
}
