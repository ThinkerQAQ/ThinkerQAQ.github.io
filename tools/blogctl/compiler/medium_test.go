package compiler

import (
	"strings"
	"testing"
)

func TestMediumUTF16MarkupOffsets(t *testing.T) {
	warnings:=[]string{}
	inline:=parseMediumInline("中😀 **bold**",&warnings)
	if inline.Text!="中😀 bold"{t.Fatalf("text = %q",inline.Text)}
	var bold *mediumMarkup
	for index:=range inline.Markups{if inline.Markups[index].Type==mediumMarkupBold{bold=&inline.Markups[index];break}}
	if bold==nil{t.Fatal("missing bold markup")}
	if bold.Start!=4||bold.End!=8{t.Fatalf("bold offset = %d..%d, want 4..8",bold.Start,bold.End)}
}

func TestMediumBlockParity(t *testing.T) {
	blocks,_:=parseMediumBlocks("- parent\n  - child\n    - [x] done\n- [ ] todo")
	got:=[]string{};for _,block:=range blocks{if block.Kind=="uli"{got=append(got,block.Text)}}
	want:=[]string{"parent","↳ child","↳ ↳ ☑ done","☐ todo"}
	if len(got)!=len(want){t.Fatalf("items=%#v",got)}
	for i:=range want{if got[i]!=want[i]{t.Fatalf("items=%#v",got)}}

	quotes,_:=parseMediumBlocks("> [!NOTE]\n> Locks establish ordering.")
	if len(quotes)!=1||quotes[0].Text!="Note.\nLocks establish ordering."{t.Fatalf("quote=%#v",quotes)}
	if len(quotes[0].Markups)==0||quotes[0].Markups[0].Start!=0||quotes[0].Markups[0].End!=5{t.Fatalf("markups=%#v",quotes[0].Markups)}
}

func TestMediumTableFlattening(t *testing.T) {
	got:=flattenMediumTables("| Expression | Meaning |\n| --- | --- |\n| `a | b` | bitwise OR |\n")
	if !strings.Contains(got,"**`a | b`** — bitwise OR"){t.Fatalf("flattened=%q",got)}
}
