export interface NavigationItem {
  label: string;
  href: string;
  children?: readonly NavigationItem[];
  external?: boolean;
}

export interface NavigationConfig {
  header?: readonly NavigationItem[];
  footer?: readonly NavigationItem[];
}
