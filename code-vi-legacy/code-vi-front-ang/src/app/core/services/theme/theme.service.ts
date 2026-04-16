import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    public theme = signal<{ mode: string; color: string }>({ mode: 'light', color: 'base' });

    constructor() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.theme.set(JSON.parse(savedTheme));
        }

        effect(() => {
            const currentTheme = this.theme();
            localStorage.setItem('theme', JSON.stringify(currentTheme));
            this.updateClass(currentTheme.mode === 'dark');
            // Needed if you handle colors via CSS variables or classes
        });
    }

    get isDark(): boolean {
        return this.theme().mode === 'dark';
    }

    toggle() {
        this.theme.update((t) => ({ ...t, mode: t.mode === 'light' ? 'dark' : 'light' }));
    }

    private updateClass(isDark: boolean) {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
}
