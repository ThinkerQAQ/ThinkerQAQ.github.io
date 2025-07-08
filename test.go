func main() {
	startChan := make(chan int)
	chanA := make(chan int)
	chanB := make(chan int)
	chanC := make(chan int)

	go printA(startChan, chanA)
	go printA(chanA, chanB)
	go printA(chanB, chanC)
	for {
		select {
		case startChan <- 1:
			
		}
	}
	
}

func printA(r, s chan int) {
	defer close(s)
	for {
		select {
		case <-r:
			fmt.Println("A")
			s<-1
		}
	}
}

func printB(r, s chan int) {
	for {
		select {
		case <-r:
			fmt.Println("B")
			s<-1
		}
	}
}

func printC(r, s chan int) {
	for {
		select {
		case <-r:
			fmt.Println("C")
			s<-1
		}
	}
}