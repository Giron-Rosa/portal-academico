import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';
import { Login } from '../login/login';

interface Slide {
  image: string;
  message: string;
}

@Component({
  selector: 'app-home',
  imports: [Navbar, Footer, Login],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  slides: Slide[] = [
    { image: 'images/hero1.jpg', message: 'Excelencia académica para un futuro brillante' },
    { image: 'images/hero2.jpg', message: 'Promovemos una formación cultural con propósito' },
    { image: 'images/hero3.jpg', message: 'Contamos con espacios deportivos y recreativos' },
  ];

  currentIndex = signal(0);
  private autoPlayInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.startAutoPlay();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  prev() {
    this.currentIndex.update(i => (i - 1 + this.slides.length) % this.slides.length);
    this.resetAutoPlay();
  }

  next() {
    this.currentIndex.update(i => (i + 1) % this.slides.length);
    this.resetAutoPlay();
  }

  goTo(index: number) {
    this.currentIndex.set(index);
    this.resetAutoPlay();
  }

  private startAutoPlay() {
    this.autoPlayInterval = setInterval(() => {
      this.currentIndex.update(i => (i + 1) % this.slides.length);
    }, 5000);
  }

  private stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  private resetAutoPlay() {
    this.stopAutoPlay();
    this.startAutoPlay();
  }
}
