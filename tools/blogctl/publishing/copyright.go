package publishing

import (
	"embed"
	"encoding/json"
)

//go:embed copyright.json
var copyrightFile embed.FS

type CopyrightText struct {
	Title       string `json:"title"`
	Notice      string `json:"notice"`
	Photo       string `json:"photo"`
	Syndication string `json:"syndication"`
	Source      string `json:"source"`
}

var copyrightPolicies = func() map[string]CopyrightText {
	data, err := copyrightFile.ReadFile("copyright.json")
	if err != nil {
		panic(err)
	}
	var result map[string]CopyrightText
	if err := json.Unmarshal(data, &result); err != nil {
		panic(err)
	}
	return result
}()

// Copyright returns the shared site and publishing attribution text.
func Copyright(language string) CopyrightText {
	if language == "en" {
		return copyrightPolicies["en"]
	}
	return copyrightPolicies["zh"]
}
