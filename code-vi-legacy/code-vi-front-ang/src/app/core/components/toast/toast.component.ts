import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible" class="fixed bottom-1 left-1/2 bg-red-500 transform -translate-x-1/2 -translate-y-1/2 text-white p-4 rounded shadow-md transition-opacity duration-200" [class.opacity-0]="!visible" [class.opacity-100]="visible">
      <span>{{ message }}</span>
      <button (click)="close()" class="ml-4 text-white font-bold">X</button>
    </div>
  `,
  styles: []
})
export class ToastComponent implements OnInit {
  @Input() message: string = '';
  visible: boolean = false; // 초기값을 false로 설정

  ngOnInit() {}

  show(message: string) {
    this.message = message;
    this.visible = true;
    setTimeout(() => this.close(), 3000); // 3초 후에 자동으로 닫힘
  }

  close() {
    this.visible = false;
  }
}
