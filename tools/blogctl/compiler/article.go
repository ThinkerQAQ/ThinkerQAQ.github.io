package compiler

import (
	"encoding/json"
	"fmt"
	"strings"
)

type Article struct {
	Title         string
	Description   string
	Status        string
	Tags          []string
	CoverImage    string
	CoverImageAlt string
	Body          string
}

func parseScalar(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", nil
	}
	if strings.HasPrefix(value, "\"") {
		var decoded string
		if err := json.Unmarshal([]byte(value), &decoded); err != nil {
			return "", err
		}
		return decoded, nil
	}
	if len(value) >= 2 && strings.HasPrefix(value, "'") && strings.HasSuffix(value, "'") {
		return strings.ReplaceAll(value[1:len(value)-1], "''", "'"), nil
	}
	return value, nil
}
func field(lines []string, name string) (string, bool) {
	prefix := name + ":"
	for _, line := range lines {
		if strings.HasPrefix(line, prefix) {
			return strings.TrimSpace(strings.TrimPrefix(line, prefix)), true
		}
	}
	return "", false
}
func scalarField(lines []string, name string, required bool) (string, error) {
	raw, ok := field(lines, name)
	if !ok {
		if required {
			return "", fmt.Errorf("missing %s in article frontmatter", name)
		}
		return "", nil
	}
	return parseScalar(raw)
}
func listField(lines []string, name string) ([]string, error) {
	raw, ok := field(lines, name)
	if !ok {
		return nil, nil
	}
	if raw != "" {
		if strings.HasPrefix(raw, "[") {
			var values []string
			if err := json.Unmarshal([]byte(raw), &values); err != nil {
				return nil, fmt.Errorf("invalid inline %s: %w", name, err)
			}
			return values, nil
		}
		var result []string
		for _, part := range strings.Split(raw, ",") {
			v, err := parseScalar(part)
			if err != nil {
				return nil, err
			}
			if strings.TrimSpace(v) != "" {
				result = append(result, v)
			}
		}
		return result, nil
	}
	idx := -1
	for i, line := range lines {
		if strings.HasPrefix(line, name+":") {
			idx = i
			break
		}
	}
	var result []string
	for i := idx + 1; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if !strings.HasPrefix(line, "- ") {
			break
		}
		v, err := parseScalar(strings.TrimSpace(strings.TrimPrefix(line, "- ")))
		if err != nil {
			return nil, err
		}
		result = append(result, v)
	}
	return result, nil
}
func ParseArticle(markdown, source string) (Article, error) {
	normalized := strings.TrimPrefix(strings.ReplaceAll(markdown, "\r\n", "\n"), "\ufeff")
	if !strings.HasPrefix(normalized, "---\n") {
		return Article{}, fmt.Errorf("invalid article frontmatter: %s", source)
	}
	rest := normalized[4:]
	end := strings.Index(rest, "\n---\n")
	sep := 5
	if end < 0 && strings.HasSuffix(rest, "\n---") {
		end = len(rest) - 4
		sep = 4
	}
	if end < 0 {
		return Article{}, fmt.Errorf("invalid article frontmatter: %s", source)
	}
	lines := strings.Split(rest[:end], "\n")
	body := strings.TrimSpace(normalized[4+end+sep:])
	title, err := scalarField(lines, "title", true)
	if err != nil {
		return Article{}, err
	}
	description, err := scalarField(lines, "description", true)
	if err != nil {
		return Article{}, err
	}
	status, err := scalarField(lines, "status", false)
	if err != nil {
		return Article{}, err
	}
	if status == "" {
		status = "draft"
	}
	tags, err := listField(lines, "tags")
	if err != nil {
		return Article{}, err
	}
	cover, err := scalarField(lines, "coverImage", false)
	if err != nil {
		return Article{}, err
	}
	coverAlt, err := scalarField(lines, "coverImageAlt", false)
	if err != nil {
		return Article{}, err
	}
	if strings.TrimSpace(title) == "" {
		return Article{}, fmt.Errorf("invalid title: %s", source)
	}
	if strings.TrimSpace(description) == "" {
		return Article{}, fmt.Errorf("invalid description: %s", source)
	}
	if body == "" {
		return Article{}, fmt.Errorf("article body is empty: %s", source)
	}
	if status == "published" && (cover == "" || coverAlt == "") {
		return Article{}, fmt.Errorf("published article cover metadata is incomplete: %s", source)
	}
	return Article{Title: title, Description: description, Status: status, Tags: tags, CoverImage: cover, CoverImageAlt: coverAlt, Body: body}, nil
}
