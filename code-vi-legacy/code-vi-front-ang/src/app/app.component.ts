import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgClass } from '@angular/common';
import { ResponsiveHelperComponent } from './core/components/responsive-helper/responsive-helper.component';
import { NgxSonnerToaster } from 'ngx-sonner';
import { ThemeService } from './core/services/theme/theme.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    RouterOutlet,
    ResponsiveHelperComponent,
    NgxSonnerToaster
  ],
})
export class AppComponent {
  title = 'METAVERSE(LMS)';

  constructor(public themeService: ThemeService) { }
}
