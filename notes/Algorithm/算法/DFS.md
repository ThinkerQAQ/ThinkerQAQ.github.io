## 1. DFS是什么
- 深度优先搜索，适用于字符串、数组、树，经常配合[回溯.md](回溯.md)使用

## 2. 字符串

### 2.1. 全排列
- 输入一个字符串，输出它的全排列
- 分析：使用树
    - ![](https://raw.githubusercontent.com/TDoct/images/master/1615217377_20210308224510963_6400.png)

#### 2.1.1. 经典做法

```go
func dfs1(str string) {
	allPaths := make([]string, 0)
	path := make([]rune, 0)
	visited := make([]bool, len(str), len(str))
	dfsRecur([]rune(str), 0, len(str), &path, &allPaths, visited)
	fmt.Println(allPaths)
}

func dfsRecur(runes []rune, index int, length int, path *[]rune, allPaths *[]string, visited []bool) {
	//终止条件
	if index == length {
		res := string(*path)
		*allPaths = append(*allPaths, res)
		return
	}

	//遍历候选节点
	for i := 0; i < length; i++ {
		//没有访问过的才访问
		if !visited[i] {
			visited[i] = true
			*path = append(*path, runes[i])

			dfsRecur(runes, index+1, length, path, allPaths, visited)

			//回溯
			visited[i] = false
			*path = (*path)[:len(*path)-1]
		}
	}
}

```
#### 2.1.2. 升级版

```go
func dfs3(str string) {
	allPaths := make([]string, 0)
	dfsRecur3([]rune(str), 0, len(str), &allPaths)
	fmt.Println(allPaths)
}

func dfsRecur3(runes []rune, index int, length int, allPaths *[]string) {
	//终止条件
	if index == length {
		res := string(runes)
		*allPaths = append(*allPaths, res)
		return
	}

	//遍历候选节点
	for i := index; i < length; i++ {

		swap(runes, i, index)

		dfsRecur3(runes, index+1, length, allPaths)

		swap(runes, i, index)

	}
}

func swap(runes []rune, i int, j int) {
	runes[i], runes[j] = runes[j], runes[i]
}
```

### 2.2. 组合

```go
func dfs2(str string) {
	allPaths := make([]string, 0)
	path := make([]rune, 0)
	dfsRecur2([]rune(str), 0, len(str), &path, &allPaths)
	fmt.Println(allPaths)
}

func dfsRecur2(runes []rune, index int, length int, path *[]rune, allPaths *[]string) {
	//终止条件
	res := string(*path)
	*allPaths = append(*allPaths, res)

	//遍历候选节点
	for i := index; i < length; i++ {
		//没有访问过的才访问
		*path = append(*path, runes[i])

		dfsRecur2(runes, i+1, length, path, allPaths)

		*path = (*path)[:len(*path)-1]

	}
}

```
- [子集.md](../leetcode/数组/DFS/全排列/子集.md)
## 3. 数组
### 3.1. 组合总和
- [组合总和.md](../leetcode/数组/DFS/求和/组合总和.md)