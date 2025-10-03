# Icons Component Usage Examples

The `Icons.tsx` component provides a centralized collection of SVG icons with consistent styling and TypeScript support.

## Basic Usage

```tsx
import { Sun, Moon, Upload, Globe, History, Send, X } from './components/Icons';

// Basic usage with default size (w-6 h-6)
<Sun />
<Moon />

// Custom size
<Sun className="w-8 h-8" />
<Moon className="w-4 h-4" />

// Custom styling
<Upload style={{ color: '#3b82f6' }} />
<Globe className="w-4 h-4 text-green-500" />

// In buttons
<button className="flex items-center gap-2">
  <Send className="w-5 h-5" />
  Send Message
</button>

<button className="p-2 rounded-full hover:bg-gray-100">
  <X className="w-4 h-4" />
</button>
```

## Available Icons

- **Sun**: Light theme indicator
- **Moon**: Dark theme indicator  
- **Upload**: File upload actions
- **Globe**: Web/network related features
- **History**: Time/history related features
- **Send**: Submit/send actions
- **X**: Close/delete actions

## Benefits

✅ **Centralized Management**: All icons in one place  
✅ **Consistent Props**: All icons accept `className` and `style` props  
✅ **TypeScript Support**: Proper typing for all components  
✅ **Easy Import**: Simple named imports  
✅ **Customizable**: Default classes but easily overridable  
✅ **Reusable**: Use anywhere in your application

## Theme Toggle Implementation

The ThemeToggle component now uses the centralized Sun and Moon icons:

```tsx
import { Sun, Moon } from './Icons';

// In the Switch component
<Switch
  startContent={<Sun className="h-3 w-3" />}
  endContent={<Moon className="h-3 w-3" />}
  // ... other props
/>
```