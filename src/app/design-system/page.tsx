"use client"

import { useState } from "react"
import { toast } from "sonner"
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Spinner } from "@/components/ui/spinner"

export default function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Responsive Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
            <h1 className="text-lg font-bold text-foreground sm:text-xl">
              Design System
            </h1>
            <div className="flex items-center gap-2">
              {/* Mobile menu - Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <span className="material-symbols-outlined">menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                  <SheetHeader>
                    <SheetTitle>Navigation</SheetTitle>
                    <SheetDescription>
                      Browse design system components
                    </SheetDescription>
                  </SheetHeader>
                  <nav className="mt-6 flex flex-col gap-2">
                    <a href="#buttons" className="rounded-md px-3 py-2 hover:bg-accent">Buttons</a>
                    <a href="#inputs" className="rounded-md px-3 py-2 hover:bg-accent">Inputs</a>
                    <a href="#cards" className="rounded-md px-3 py-2 hover:bg-accent">Cards</a>
                    <a href="#feedback" className="rounded-md px-3 py-2 hover:bg-accent">Feedback</a>
                  </nav>
                </SheetContent>
              </Sheet>
              {/* Desktop nav */}
              <nav className="hidden gap-4 md:flex">
                <a href="#buttons" className="text-sm text-muted-foreground hover:text-foreground">Buttons</a>
                <a href="#inputs" className="text-sm text-muted-foreground hover:text-foreground">Inputs</a>
                <a href="#cards" className="text-sm text-muted-foreground hover:text-foreground">Cards</a>
                <a href="#feedback" className="text-sm text-muted-foreground hover:text-foreground">Feedback</a>
              </nav>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
          <div className="mx-auto max-w-5xl space-y-12 sm:space-y-16">
            {/* Intro */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                ExpandNote Design System
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                Core UI components built with shadcn/ui. Responsive, accessible, and themeable.
              </p>
            </section>

            {/* Buttons Section */}
            <section id="buttons" className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Buttons</h2>

              {/* Variants - Responsive grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Variants</CardTitle>
                  <CardDescription>Different button styles for different contexts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="ai">AI Action</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sizes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Sizes</CardTitle>
                  <CardDescription>Small, default, and large button sizes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                  </div>
                </CardContent>
              </Card>

              {/* With Icons */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">With Icons</CardTitle>
                  <CardDescription>Icon buttons and buttons with icons</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon-sm" variant="outline">
                          <span className="material-symbols-outlined text-lg">add</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add new</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="outline">
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon-lg" variant="destructive">
                          <span className="material-symbols-outlined text-2xl">delete</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                    <Button variant="ai">
                      <span className="material-symbols-outlined">auto_awesome</span>
                      Run AI
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Inputs Section */}
            <section id="inputs" className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Form Inputs</h2>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Text Inputs</CardTitle>
                  <CardDescription>Various input types with responsive layout</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="default-input">Default Input</Label>
                      <Input id="default-input" placeholder="Enter text..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-input">Email Input</Label>
                      <Input id="email-input" type="email" placeholder="email@example.com" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="textarea">Textarea</Label>
                      <Textarea id="textarea" placeholder="Write your note..." className="min-h-[100px]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Select & Checkbox</CardTitle>
                  <CardDescription>Dropdown and toggle inputs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>AI Provider</Label>
                      <Select>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="openrouter">OpenRouter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-4">
                      <Label>Options</Label>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="favorite" />
                          <Label htmlFor="favorite" className="font-normal">Mark as favorite</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="archived" />
                          <Label htmlFor="archived" className="font-normal">Archive note</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Cards Section */}
            <section id="cards" className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Cards</h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">description</span>
                      Note Card
                    </CardTitle>
                    <CardDescription>A simple note preview card</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This is an example of a note card that could be used in the note list.
                    </p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Badge>work</Badge>
                    <Badge variant="secondary">ideas</Badge>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-ai-purple">auto_awesome</span>
                      AI Profile
                    </CardTitle>
                    <CardDescription>Summarize Notes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Automatically summarize tagged notes using GPT-4.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ai" size="sm" className="w-full">
                      <span className="material-symbols-outlined">play_arrow</span>
                      Run Profile
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="sm:col-span-2 lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-ai-teal">settings</span>
                      Settings Card
                    </CardTitle>
                    <CardDescription>Configure your preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                      <Checkbox id="dark-mode" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync">Auto Sync</Label>
                      <Checkbox id="sync" defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Feedback Section */}
            <section id="feedback" className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Feedback</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Badges */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Badges</CardTitle>
                    <CardDescription>Status indicators and labels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge>Default</Badge>
                      <Badge variant="secondary">Secondary</Badge>
                      <Badge variant="destructive">Destructive</Badge>
                      <Badge variant="outline">Outline</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Spinners */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Loading Spinners</CardTitle>
                    <CardDescription>Different spinner sizes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Spinner size="sm" />
                      <Spinner size="default" />
                      <Spinner size="lg" />
                    </div>
                  </CardContent>
                </Card>

                {/* Toasts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Toast Notifications</CardTitle>
                    <CardDescription>Trigger different toast types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.success("Note saved successfully!")}
                      >
                        Success
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.error("Failed to save note")}
                      >
                        Error
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.info("Syncing notes...")}
                      >
                        Info
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.warning("Connection unstable")}
                      >
                        Warning
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Dialog */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Dialog & Sheet</CardTitle>
                    <CardDescription>Modal overlays (responsive)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">Open Dialog</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Create New Note</DialogTitle>
                            <DialogDescription>
                              Add a new note to your collection. Click save when done.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="note-title">Title</Label>
                              <Input id="note-title" placeholder="Note title..." />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="note-content">Content</Label>
                              <Textarea id="note-content" placeholder="Start writing..." />
                            </div>
                          </div>
                          <DialogFooter className="flex-col gap-2 sm:flex-row">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={() => {
                              toast.success("Note created!")
                              setDialogOpen(false)
                            }}>
                              Save Note
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Sheet>
                        <SheetTrigger asChild>
                          <Button size="sm" variant="outline">Open Sheet</Button>
                        </SheetTrigger>
                        <SheetContent className="w-[300px] sm:w-[400px]">
                          <SheetHeader>
                            <SheetTitle>Note Details</SheetTitle>
                            <SheetDescription>
                              View and edit note properties
                            </SheetDescription>
                          </SheetHeader>
                          <div className="mt-6 space-y-4">
                            <div className="space-y-2">
                              <Label>Tags</Label>
                              <div className="flex flex-wrap gap-2">
                                <Badge>work</Badge>
                                <Badge>important</Badge>
                                <Button size="sm" variant="ghost">
                                  <span className="material-symbols-outlined text-sm">add</span>
                                  Add Tag
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Created</Label>
                              <p className="text-sm text-muted-foreground">Dec 25, 2025</p>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Color Palette */}
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Color Palette</h2>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <div className="space-y-2">
                  <div className="h-12 rounded-lg bg-primary sm:h-16"></div>
                  <p className="text-xs font-medium sm:text-sm">Primary (Blue)</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 rounded-lg bg-gradient-to-r from-[#9333ea] to-[#a855f7] sm:h-16"></div>
                  <p className="text-xs font-medium sm:text-sm">AI Purple</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 rounded-lg bg-[#14b8a6] sm:h-16"></div>
                  <p className="text-xs font-medium sm:text-sm">AI Teal</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 rounded-lg bg-destructive sm:h-16"></div>
                  <p className="text-xs font-medium sm:text-sm">Destructive</p>
                </div>
              </div>
            </section>

            {/* Responsive Breakpoints Info */}
            <section className="space-y-4 rounded-lg border bg-muted/30 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">Responsive Breakpoints</h2>
              <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded bg-background p-3">
                  <p className="font-medium">sm: 640px</p>
                  <p className="text-muted-foreground">Small tablets</p>
                </div>
                <div className="rounded bg-background p-3">
                  <p className="font-medium">md: 768px</p>
                  <p className="text-muted-foreground">Tablets</p>
                </div>
                <div className="rounded bg-background p-3">
                  <p className="font-medium">lg: 1024px</p>
                  <p className="text-muted-foreground">Laptops</p>
                </div>
                <div className="rounded bg-background p-3">
                  <p className="font-medium">xl: 1280px</p>
                  <p className="text-muted-foreground">Desktops</p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
