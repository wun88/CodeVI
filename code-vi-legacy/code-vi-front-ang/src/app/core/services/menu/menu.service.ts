import { Injectable, signal } from '@angular/core';
import { Menu } from '../../constants/menu';
import { MenuItem, SubMenuItem } from '../../models/common/menu.model';

@Injectable({
    providedIn: 'root',
})
export class MenuService {
    private _showSideBar = signal(true);
    private _showMobileMenu = false;
    private _pagesMenu = signal<MenuItem[]>(Menu.pages);

    get showSideBar() {
        return this._showSideBar();
    }

    get showMobileMenu() {
        return this._showMobileMenu;
    }

    set showMobileMenu(value: boolean) {
        this._showMobileMenu = value;
    }

    get pagesMenu() {
        return this._pagesMenu();
    }

    toggleSidebar() {
        this._showSideBar.set(!this._showSideBar());
    }

    toggleMobileMenu() {
        this._showMobileMenu = !this._showMobileMenu;
    }

    toggleMenu(menu: any) {
        this.showSideBar = true;
        menu.expanded = !menu.expanded;
    }

    toggleSubMenu(submenu: SubMenuItem) {
        submenu.expanded = !submenu.expanded;
    }

    set showSideBar(value: boolean) {
        this._showSideBar.set(value);
    }
}
