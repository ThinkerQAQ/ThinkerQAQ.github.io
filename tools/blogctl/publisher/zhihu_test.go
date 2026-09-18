package publisher

import (
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
	if strings.Contains(got, "style=") || strings.Contains(got, "data-foo=") {
		t.Fatalf("unsupported attributes were not removed: %s", got)
	}
	if !strings.Contains(got, "data-draft-node=") {
		t.Fatalf("Draft.js attributes were removed: %s", got)
	}
}

func TestTransformZhihuHTMLKeepsDraftTableAttributes(t *testing.T) {
	input := `<table data-draft-node="block" data-draft-type="table"><tbody><tr><td>a</td></tr></tbody></table>`
	got := transformZhihuHTML(input)
	if !strings.Contains(got, `data-draft-node="block"`) || !strings.Contains(got, `data-draft-type="table"`) {
		t.Fatalf("draft attributes were lost: %s", got)
	}
}
