import { useState } from 'react';
import NextLink from 'next/link';
import {
  Button,
  Link,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
} from '@heroui/react';
import ThemeToggle from './xThemeToggle';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Advanced Search' },
  { href: '/equivalency', label: 'Equivalency' },
];

export default function AppNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Navbar
      maxWidth="xl"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="border-b border-content3/40 bg-background/70 backdrop-blur"
    >
      <NavbarContent justify="start">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="sm:hidden"
        />
        <NavbarBrand className="gap-2 text-foreground">
          <Link as={NextLink} href="/" color="foreground" className="text-base font-semibold">
            PS Salary Data
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden gap-6 sm:flex" justify="center">
        {NAV_ITEMS.map((item) => (
          <NavbarItem key={item.href}>
            <Link as={NextLink} href={item.href} color="foreground" className="text-sm font-medium">
              {item.label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end" className="items-center gap-2">
        <NavbarItem className="hidden sm:flex">
          <ThemeToggle />
        </NavbarItem>
        <NavbarItem>
          <Button as={NextLink} color="primary" variant="flat" size="sm" href="/admin">
            Admin
          </Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu>
        {NAV_ITEMS.map((item) => (
          <NavbarMenuItem key={item.href}>
            <Link
              as={NextLink}
              href={item.href}
              color="foreground"
              className="w-full text-base"
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}
        <NavbarMenuItem>
          <div className="flex items-center justify-between">
            <span className="text-sm text-default-500">Theme</span>
            <ThemeToggle />
          </div>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Button as={NextLink} href="/admin" color="primary" variant="flat" className="w-full">
            Admin Console
          </Button>
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  );
}