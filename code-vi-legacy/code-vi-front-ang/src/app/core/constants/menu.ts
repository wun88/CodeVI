import { MenuItem } from '../models/common/menu.model';

export class Menu {
  public static pages: MenuItem[] = [
    {
      group: 'Main',
      separator: true,
      role: ['student', 'instructor', 'admin'],
      authStatus: 'any',
      items: [
        {
          icon: 'assets/icons/heroicons/outline/home.svg',
          label: 'Introduction',
          route: '/main',
          role: ['student', 'instructor', 'admin'],
          authStatus: 'any'
        }
      ],
    },
    {
      group: 'Dashboard',
      separator: true,
      role: ['admin'],
      authStatus: 'authenticated',
      items: [
        {
          icon: 'assets/icons/heroicons/outline/chart-bar.svg',
          label: 'Dashboard',
          route: '/dashboard',
          role: ['instructor', 'admin'],
          authStatus: 'authenticated'
        }
      ],
    },
    {
      group: 'Auth',
      separator: false,
      items: [
        {
          icon: 'assets/icons/heroicons/outline/user-plus.svg',
          label: 'Sign up',
          route: '/auth/sign-up',
          authStatus: 'unauthenticated'
        },
        {
          icon: 'assets/icons/heroicons/outline/lock-closed.svg',
          label: 'Sign in',
          route: '/auth/sign-in',
          authStatus: "unauthenticated"
        },
        {
          icon: 'assets/icons/heroicons/outline/lock-open.svg',
          label: 'Sign out',
          route: '/auth/sign-out',
          authStatus: 'authenticated'
        },
      ],
    },
  ];
}
