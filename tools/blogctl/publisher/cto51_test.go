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

func TestSelectCTO51CategoryUsesArticleTagOrder(t *testing.T) {
	categories := []cto51Category{{
		ID: "31", Name: "后端开发",
		Item: []cto51Category{{ID: "15", Name: "Java"}, {ID: "68", Name: "Go语言"}},
	}}
	parentID, categoryID, name, err := selectCTO51Category([]string{"java", "Go"}, categories)
	if err != nil {
		t.Fatal(err)
	}
	if parentID != "31" || categoryID != "15" || name != "Java" {
		t.Fatalf("classification = %q/%q/%q", parentID, categoryID, name)
	}
}
