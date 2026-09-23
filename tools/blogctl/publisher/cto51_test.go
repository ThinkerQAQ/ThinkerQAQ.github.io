package publisher

import (
	"net/url"
	"reflect"
	"testing"
)

func TestCTO51AppendImageURLsMatchesCapturedFormShape(t *testing.T) {
	values := url.Values{}
	cto51AppendImageURLs(values, `# title

![one](https://s2.51cto.com/images/blog/front/a.png)
![two](https://assets.example/b.png)
![duplicate](https://s2.51cto.com/images/blog/front/a.png)
![local](local.png)
`)

	got := values["img_urls[]"]
	want := []string{
		"https://s2.51cto.com/images/blog/front/a.png",
		"https://assets.example/b.png",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("img_urls[] = %#v, want %#v", got, want)
	}
}
