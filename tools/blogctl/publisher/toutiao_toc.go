package publisher

import (
	"strings"

	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

// normalizeToutiaoTOC converts the nested Markdown TOC into one list item per
// heading. Toutiao's creator editor merges nested LI links into the parent
// item and removes heading IDs, making the original TOC unreadable and its
// in-page links ineffective. Only a list immediately following a TOC heading
// is rewritten; article body lists are preserved.
func normalizeToutiaoTOC(raw string) string {
	root := &html.Node{Type: html.ElementNode, Data: "body", DataAtom: atom.Body}
	fragment, err := html.ParseFragment(strings.NewReader(raw), root)
	if err != nil {
		return raw
	}
	for _, node := range fragment {
		root.AppendChild(node)
	}
	changed := false
	for heading := root.FirstChild; heading != nil; heading = heading.NextSibling {
		if !toutiaoTOCHeading(heading) {
			continue
		}
		list := heading.NextSibling
		for list != nil && (list.Type == html.CommentNode ||
			(list.Type == html.TextNode && strings.TrimSpace(list.Data) == "")) {
			list = list.NextSibling
		}
		if !toutiaoListNode(list) {
			continue
		}
		replacement := &html.Node{Type: html.ElementNode, Data: "ul", DataAtom: atom.Ul}
		toutiaoAppendTOCItems(list, 0, replacement)
		if replacement.FirstChild == nil {
			continue
		}
		list.Parent.InsertBefore(replacement, list)
		list.Parent.RemoveChild(list)
		changed = true
	}
	if !changed {
		return raw
	}
	var result strings.Builder
	for child := root.FirstChild; child != nil; child = child.NextSibling {
		if err := html.Render(&result, child); err != nil {
			return raw
		}
	}
	return result.String()
}

func toutiaoTOCHeading(node *html.Node) bool {
	if node == nil || node.Type != html.ElementNode {
		return false
	}
	switch node.Data {
	case "h1", "h2", "h3", "h4", "h5", "h6":
	default:
		return false
	}
	text := strings.ToLower(strings.TrimSpace(toutiaoText(node, false)))
	switch text {
	case "目录", "table of contents", "contents":
		return true
	}
	return false
}

func toutiaoListNode(node *html.Node) bool {
	return node != nil && node.Type == html.ElementNode && (node.Data == "ul" || node.Data == "ol")
}

func toutiaoText(node *html.Node, ignoreLists bool) string {
	if node == nil || (ignoreLists && toutiaoListNode(node)) {
		return ""
	}
	if node.Type == html.TextNode {
		return node.Data
	}
	var b strings.Builder
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		b.WriteString(toutiaoText(child, ignoreLists))
	}
	return b.String()
}

func toutiaoOwnLinks(node *html.Node, links *[]string) {
	if toutiaoListNode(node) {
		return
	}
	if node.Type == html.ElementNode && node.Data == "a" {
		if text := strings.Join(strings.Fields(toutiaoText(node, false)), " "); text != "" {
			*links = append(*links, text)
		}
		return
	}
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		toutiaoOwnLinks(child, links)
	}
}

func toutiaoTOCDepth(label string, nestedDepth int) int {
	fields := strings.Fields(label)
	if len(fields) == 0 {
		return nestedDepth
	}
	// 1. Heading -> depth 0, 1.1 Heading -> depth 1,
	// 1.3.1 Heading -> depth 2. Non-numbered labels use DOM nesting.
	numeric := strings.TrimSuffix(fields[0], ".")
	sections := strings.Split(numeric, ".")
	if numeric == "" {
		return nestedDepth
	}
	for _, section := range sections {
		if section == "" {
			return nestedDepth
		}
		for _, digit := range section {
			if digit < '0' || digit > '9' {
				return nestedDepth
			}
		}
	}
	return min(len(sections)-1, 3)
}

func toutiaoAddTOCItem(dest *html.Node, label string, depth int) {
	if label == "" {
		return
	}
	item := &html.Node{Type: html.ElementNode, Data: "li", DataAtom: atom.Li}
	// U+3000 is not collapsed by HTML whitespace normalization.
	item.AppendChild(&html.Node{Type: html.TextNode, Data: strings.Repeat("　", toutiaoTOCDepth(label, depth)) + label})
	dest.AppendChild(item)
}

func toutiaoAppendTOCItems(list *html.Node, depth int, output *html.Node) {
	for item := list.FirstChild; item != nil; item = item.NextSibling {
		if item.Type != html.ElementNode || item.Data != "li" {
			continue
		}
		var links []string
		toutiaoOwnLinks(item, &links)
		if len(links) > 0 {
			for _, link := range links {
				toutiaoAddTOCItem(output, link, depth)
			}
		} else {
			toutiaoAddTOCItem(output, strings.Join(strings.Fields(toutiaoText(item, true)), " "), depth)
		}
		for child := item.FirstChild; child != nil; child = child.NextSibling {
			if toutiaoListNode(child) {
				toutiaoAppendTOCItems(child, depth+1, output)
			}
		}
	}
}
