export interface MenuItem {
  icon?: string;
  group: string;
  separator?: boolean;
  selected?: boolean;
  active?: boolean;
  items: Array<SubMenuItem>;
  role?: string[];
  authStatus?: 'authenticated' | 'unauthenticated' | 'any';
}

export interface SubMenuItem {
  icon?: string;
  label?: string;
  route?: string | null;
  expanded?: boolean;
  active?: boolean;
  children?: Array<SubMenuItem>;
  role?: string[];
  authStatus?: 'authenticated' | 'unauthenticated' | 'any';
}
