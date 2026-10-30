package publishing

import (
	"strings"
	"testing"
)

func TestCopyrightPolicyBilingualAndComplete(t *testing.T) {
	for _, language := range []string{"zh-CN", "en"} {
		copy := Copyright(language)
		if copy.Title == "" || copy.Notice == "" || copy.Photo == "" || copy.Syndication == "" || copy.Source == "" {
			t.Fatalf("incomplete policy for %s: %+v", language, copy)
		}
		if !strings.Contains(copy.Notice, "ThinkerQAQ") || !strings.Contains(copy.Syndication, "ThinkerQAQ") || !strings.Contains(copy.Photo, "ThinkerQAQ") {
			t.Fatalf("missing attribution for %s", language)
		}
	}
	if Copyright("en").Title == Copyright("zh-CN").Title {
		t.Fatal("policy should be localized")
	}
}
