"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground">
            ExpandNote Design System
          </h1>
          <p className="mt-2 text-foreground-secondary">
            Core UI components built with shadcn/ui
          </p>
        </header>

        {/* Buttons Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Buttons</h2>

          {/* Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Variants</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="ai">AI Action</Button>
            </div>
          </div>

          {/* Sizes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Sizes</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>

          {/* With Icons */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">With Icons</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="icon-sm">
                <span className="material-symbols-outlined text-lg">add</span>
              </Button>
              <Button size="icon">
                <span className="material-symbols-outlined text-xl">edit</span>
              </Button>
              <Button size="icon-lg">
                <span className="material-symbols-outlined text-2xl">
                  delete
                </span>
              </Button>
              <Button variant="ai">
                <span className="material-symbols-outlined">auto_awesome</span>
                Run AI
              </Button>
            </div>
          </div>

          {/* Disabled */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">
              Disabled State
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button disabled>Disabled</Button>
              <Button variant="ai" disabled>
                AI Disabled
              </Button>
            </div>
          </div>
        </section>

        {/* Inputs Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Inputs</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default-input">Default Input</Label>
              <Input id="default-input" placeholder="Enter text..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disabled-input">Disabled Input</Label>
              <Input
                id="disabled-input"
                placeholder="Disabled"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-input">Email Input</Label>
              <Input
                id="email-input"
                type="email"
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-input">Password Input</Label>
              <Input
                id="password-input"
                type="password"
                placeholder="Enter password"
              />
            </div>
          </div>
        </section>

        {/* Textarea Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Textarea</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default-textarea">Default Textarea</Label>
              <Textarea
                id="default-textarea"
                placeholder="Write your note..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disabled-textarea">Disabled Textarea</Label>
              <Textarea
                id="disabled-textarea"
                placeholder="Disabled"
                disabled
              />
            </div>
          </div>
        </section>

        {/* Select Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Select</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Output Mode</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select output mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">Append to Note</SelectItem>
                  <SelectItem value="replace">Replace Note</SelectItem>
                  <SelectItem value="new">Create New Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Checkbox Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Checkbox</h2>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <Label htmlFor="terms">Accept terms and conditions</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="favorite" defaultChecked />
              <Label htmlFor="favorite">Mark as favorite</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="disabled-check" disabled />
              <Label htmlFor="disabled-check" className="opacity-50">
                Disabled checkbox
              </Label>
            </div>
          </div>
        </section>

        {/* Color Palette Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Color Palette
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="h-16 rounded-lg bg-primary"></div>
              <p className="text-sm font-medium">Primary (Blue)</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-lg bg-gradient-to-r from-[#9333ea] to-[#a855f7]"></div>
              <p className="text-sm font-medium">AI Purple</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-lg bg-[#14b8a6]"></div>
              <p className="text-sm font-medium">AI Teal</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 rounded-lg bg-destructive"></div>
              <p className="text-sm font-medium">Destructive</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
