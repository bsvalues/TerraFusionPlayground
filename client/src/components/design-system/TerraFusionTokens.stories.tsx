import type { Meta, StoryObj } from '@storybook/react';
import { TokenDisplay } from './TokenDisplay';

const meta: Meta<typeof TokenDisplay> = {
  title: 'Design System/TerraFusion Tokens',
  component: TokenDisplay,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof TokenDisplay>;

export const Colors: Story = {
  args: {
    groups: [
      {
        title: 'Primary Colors',
        tokens: [
          { name: 'Primary Blue', value: 'hsl(210, 100%, 45%)', cssVar: 'var(--color-primary-blue)' },
          { name: 'Primary Blue Light', value: 'hsl(210, 100%, 55%)', cssVar: 'var(--color-primary-blue-light)' },
          { name: 'Primary Blue Dark', value: 'hsl(210, 100%, 35%)', cssVar: 'var(--color-primary-blue-dark)' },
          { name: 'Primary Green', value: 'hsl(145, 63%, 42%)', cssVar: 'var(--color-primary-green)' },
          { name: 'Primary Green Light', value: 'hsl(145, 63%, 52%)', cssVar: 'var(--color-primary-green-light)' },
          { name: 'Primary Green Dark', value: 'hsl(145, 63%, 32%)', cssVar: 'var(--color-primary-green-dark)' },
          { name: 'Primary Orange', value: 'hsl(30, 100%, 50%)', cssVar: 'var(--color-primary-orange)' },
          { name: 'Primary Orange Light', value: 'hsl(30, 100%, 60%)', cssVar: 'var(--color-primary-orange-light)' },
          { name: 'Primary Orange Dark', value: 'hsl(30, 100%, 40%)', cssVar: 'var(--color-primary-orange-dark)' },
          { name: 'Primary Red', value: 'hsl(0, 85%, 55%)', cssVar: 'var(--color-primary-red)' },
          { name: 'Primary Red Light', value: 'hsl(0, 85%, 65%)', cssVar: 'var(--color-primary-red-light)' },
          { name: 'Primary Red Dark', value: 'hsl(0, 85%, 45%)', cssVar: 'var(--color-primary-red-dark)' },
        ],
      },
      {
        title: 'Secondary Colors',
        tokens: [
          { name: 'Secondary Blue', value: 'hsl(210, 100%, 65%)', cssVar: 'var(--color-secondary-blue)' },
          { name: 'Secondary Blue Light', value: 'hsl(210, 100%, 85%)', cssVar: 'var(--color-secondary-blue-light)' },
          { name: 'Secondary Green', value: 'hsl(145, 63%, 62%)', cssVar: 'var(--color-secondary-green)' },
          { name: 'Secondary Green Light', value: 'hsl(145, 63%, 82%)', cssVar: 'var(--color-secondary-green-light)' },
          { name: 'Secondary Orange', value: 'hsl(30, 100%, 70%)', cssVar: 'var(--color-secondary-orange)' },
          { name: 'Secondary Orange Light', value: 'hsl(30, 100%, 90%)', cssVar: 'var(--color-secondary-orange-light)' },
          { name: 'Secondary Red', value: 'hsl(0, 85%, 75%)', cssVar: 'var(--color-secondary-red)' },
          { name: 'Secondary Red Light', value: 'hsl(0, 85%, 95%)', cssVar: 'var(--color-secondary-red-light)' },
        ],
      },
      {
        title: 'Neutral Colors',
        tokens: [
          { name: 'Black', value: 'hsl(210, 10%, 10%)', cssVar: 'var(--color-black)' },
          { name: 'White', value: 'hsl(210, 10%, 98%)', cssVar: 'var(--color-white)' },
          { name: 'Gray Dark', value: 'hsl(210, 10%, 25%)', cssVar: 'var(--color-primary-gray-dark)' },
          { name: 'Gray', value: 'hsl(210, 10%, 50%)', cssVar: 'var(--color-primary-gray)' },
          { name: 'Gray Light', value: 'hsl(210, 10%, 75%)', cssVar: 'var(--color-primary-gray-light)' },
        ],
      },
      {
        title: 'Accent Colors',
        tokens: [
          { name: 'Accent Teal', value: 'hsl(180, 70%, 45%)', cssVar: 'var(--color-accent-teal)' },
          { name: 'Accent Purple', value: 'hsl(270, 70%, 55%)', cssVar: 'var(--color-accent-purple)' },
          { name: 'Accent Gold', value: 'hsl(45, 90%, 50%)', cssVar: 'var(--color-accent-gold)' },
        ],
      },
      {
        title: 'System Colors',
        tokens: [
          { name: 'Success', value: 'hsl(145, 80%, 42%)', cssVar: 'var(--color-success)' },
          { name: 'Warning', value: 'hsl(45, 100%, 50%)', cssVar: 'var(--color-warning)' },
          { name: 'Error', value: 'hsl(0, 85%, 55%)', cssVar: 'var(--color-error)' },
          { name: 'Info', value: 'hsl(210, 100%, 55%)', cssVar: 'var(--color-info)' },
        ],
      },
    ],
  },
};

export const Typography: Story = {
  args: {
    groups: [
      {
        title: 'Font Families',
        tokens: [
          { name: 'Display Font', value: 'Inter, system-ui, sans-serif', cssVar: 'var(--font-display)' },
          { name: 'Body Font', value: 'Inter, system-ui, sans-serif', cssVar: 'var(--font-body)' },
          { name: 'Mono Font', value: 'JetBrains Mono, monospace', cssVar: 'var(--font-mono)' },
        ],
      },
    ],
  },
};

export const Spacing: Story = {
  args: {
    groups: [
      {
        title: 'Border Radius',
        tokens: [
          { name: 'None', value: '0', cssVar: 'var(--radius-none)' },
          { name: 'Small', value: '0.25rem', cssVar: 'var(--radius-sm)' },
          { name: 'Medium', value: '0.5rem', cssVar: 'var(--radius-md)' },
          { name: 'Large', value: '0.75rem', cssVar: 'var(--radius-lg)' },
          { name: 'Extra Large', value: '1rem', cssVar: 'var(--radius-xl)' },
          { name: '2XL', value: '1.5rem', cssVar: 'var(--radius-2xl)' },
          { name: 'Full', value: '9999px', cssVar: 'var(--radius-full)' },
        ],
      },
    ],
  },
};