'use client';

import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

export default function Home() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-foreground">ExpandNote</span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg bg-background-surface border border-border hover:border-foreground-secondary/30 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-foreground-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <Link
                href="/login"
                className="text-foreground-secondary hover:text-foreground transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-white rounded-lg transition-all font-medium"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
              color: '#a78bfa'
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#a78bfa' }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#8b5cf6' }}></span>
            </span>
            Powered by 40+ AI Models
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight leading-tight">
            Your Notes,{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Supercharged
            </span>
            <br />by AI
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-foreground-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
            Create smarter notes with AI automation, intelligent tagging, and seamless sync.
            The note-taking app that thinks with you.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 text-white rounded-xl transition-all font-semibold text-lg hover:opacity-90 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                boxShadow: '0 10px 40px -10px rgba(139, 92, 246, 0.5)'
              }}
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-background-surface text-foreground rounded-xl hover:bg-background transition-all font-semibold text-lg border border-border hover:scale-105"
            >
              Sign In
            </Link>
          </div>

          {/* Trust indicator */}
          <p className="mt-8 text-sm text-foreground-secondary">
            No credit card required • Free to start • Your data stays private
          </p>
        </div>
      </section>

      {/* AI Profiles Showcase */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                color: '#34d399'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Automated Workflows
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              AI That Works{' '}
              <span style={{ color: '#3b82f6' }}>For You</span>
            </h2>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
              Create AI Profiles that automatically process your notes. Just add a tag, and let AI do the rest.
            </p>
          </div>

          {/* Workflow Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div
              className="rounded-3xl p-8 border transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
                borderColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: '#3b82f6', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)' }}
                >
                  1
                </div>
                <div>
                  <h3 className="font-bold text-xl text-foreground">Write Your Note</h3>
                  <p className="text-sm" style={{ color: '#60a5fa' }}>Capture your thoughts</p>
                </div>
              </div>

              <div className="bg-background-surface rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#eab308' }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                </div>
                <p className="font-mono text-sm mb-2" style={{ color: '#60a5fa' }}># Meeting Notes</p>
                <p className="text-foreground-secondary text-sm leading-relaxed">
                  Discussed Q4 roadmap, budget allocation, and team expansion plans...
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className="rounded-3xl p-8 border transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
                borderColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)'
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: '#8b5cf6', boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)' }}
                >
                  2
                </div>
                <div>
                  <h3 className="font-bold text-xl text-foreground">Add a Tag</h3>
                  <p className="text-sm" style={{ color: '#a78bfa' }}>Trigger the magic</p>
                </div>
              </div>

              <div className="bg-background-surface rounded-2xl p-5 border border-border">
                <p className="text-sm text-foreground-secondary mb-3">Select tags:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span
                    className="px-4 py-2 text-white rounded-full text-sm font-medium"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)' }}
                  >
                    #summarize
                  </span>
                  <span className="px-4 py-2 bg-background text-foreground-secondary rounded-full text-sm border border-border">
                    #meeting
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: '#a78bfa' }}>
                  <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  AI Profile triggered!
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className="rounded-3xl p-8 border transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                borderColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: '#10b981', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)' }}
                >
                  3
                </div>
                <div>
                  <h3 className="font-bold text-xl text-foreground">AI Generates</h3>
                  <p className="text-sm" style={{ color: '#34d399' }}>Instant results</p>
                </div>
              </div>

              <div className="bg-background-surface rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' }}
                  >
                    <svg className="w-4 h-4" style={{ color: '#34d399' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#34d399' }}>AI Summary</span>
                </div>
                <p className="text-foreground-secondary text-sm leading-relaxed">
                  <strong className="text-foreground">Key decisions:</strong> Q4 roadmap approved, $2M budget allocated...
                </p>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12">
            <p className="text-foreground-secondary mb-4">
              Works with OpenAI, Claude, Gemini, Llama, Grok & 40+ more models
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-background-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
              Powerful features designed for modern note-taking
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* AI Profiles */}
            <FeatureCard
              title="AI Profiles"
              description="Create custom AI automations triggered by tags. Add #summarize and watch AI transform your notes instantly."
              color="#8b5cf6"
              theme={theme}
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              }
            />

            {/* 40+ AI Models */}
            <FeatureCard
              title="40+ AI Models"
              description="Access GPT-4, Claude, Gemini, Llama, Mistral, Grok and more. Choose the perfect model for each task."
              color="#f59e0b"
              theme={theme}
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              }
            />

            {/* Email-to-Note */}
            <FeatureCard
              title="Email-to-Note"
              description="Send emails to your unique address and they become notes. Supports PDF and Word attachments."
              color="#ec4899"
              theme={theme}
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              }
            />

            {/* Offline-First */}
            <FeatureCard
              title="Offline-First"
              description="Works without internet. Your notes sync automatically when you're back online across all devices."
              color="#0ea5e9"
              theme={theme}
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
              }
            />

            {/* Smart Tagging */}
            <FeatureCard
              title="Smart Tagging"
              description="Organize notes with powerful tags. Filter, search, and trigger AI automations with a simple #hashtag."
              color="#14b8a6"
              theme={theme}
              icon={
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.008v.008H6V6z" />
                </>
              }
            />

            {/* Version History */}
            <FeatureCard
              title="Version History"
              description="Never lose your work. Automatic versioning lets you restore any previous version of your notes."
              color="#6366f1"
              theme={theme}
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              }
            />
          </div>
        </div>
      </section>

      {/* AI Providers */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Powered by the World&apos;s Best AI
            </h2>
            <p className="text-foreground-secondary">
              Choose from 40+ models across leading AI providers
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'OpenAI', subtitle: 'GPT-4' },
              { name: 'Anthropic', subtitle: 'Claude' },
              { name: 'Google', subtitle: 'Gemini' },
              { name: 'Meta', subtitle: 'Llama' },
              { name: 'Mistral', subtitle: 'AI' },
              { name: 'xAI', subtitle: 'Grok' },
            ].map((provider) => (
              <div
                key={provider.name}
                className="flex flex-col items-center justify-center p-6 bg-background-surface rounded-2xl border border-border hover:border-foreground-secondary/30 transition-all"
              >
                <span className="text-lg font-semibold text-foreground">
                  {provider.name}
                </span>
                <span className="text-sm text-foreground-secondary">
                  {provider.subtitle}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile Coming Soon */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="relative rounded-3xl p-8 sm:p-12 overflow-hidden border"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              borderColor: theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.8)',
              boxShadow: theme === 'dark'
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                : '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl" style={{ backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }} />

            <div className="relative flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 border"
                  style={{
                    background: theme === 'dark'
                      ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)'
                      : 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
                    borderColor: theme === 'dark' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.4)',
                    color: theme === 'dark' ? '#fdba74' : '#c2410c'
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Coming Soon
                </div>
                <h2
                  className="text-3xl sm:text-4xl font-bold mb-4"
                  style={{ color: theme === 'dark' ? '#ffffff' : '#0f172a' }}
                >
                  iOS & Android Apps
                </h2>
                <p
                  className="text-lg mb-6"
                  style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}
                >
                  Take your AI-powered notes anywhere. Native mobile apps with offline support, voice input, and seamless sync.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <div
                    className="flex items-center gap-2 px-5 py-3 rounded-xl transition-colors cursor-pointer border"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.05)',
                      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
                      color: theme === 'dark' ? '#ffffff' : '#0f172a'
                    }}
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <span className="font-medium">App Store</span>
                  </div>
                  <div
                    className="flex items-center gap-2 px-5 py-3 rounded-xl transition-colors cursor-pointer border"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.05)',
                      borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
                      color: theme === 'dark' ? '#ffffff' : '#0f172a'
                    }}
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    <span className="font-medium">Google Play</span>
                  </div>
                </div>
              </div>

              {/* Phone mockup */}
              <div className="flex-shrink-0">
                <div
                  className="relative w-48 h-96 rounded-[2.5rem] border-4 shadow-2xl"
                  style={{
                    backgroundColor: theme === 'dark' ? '#020617' : '#1e293b',
                    borderColor: theme === 'dark' ? '#334155' : '#475569'
                  }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 rounded-b-xl" style={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#334155' }} />
                  <div
                    className="absolute inset-4 top-8 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)' }}
                  >
                    <div className="text-center">
                      <div
                        className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)'
                        }}
                      >
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <p className="text-white text-sm font-semibold">ExpandNote</p>
                      <p className="text-slate-400 text-xs mt-1">Mobile App</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="py-20 px-4"
        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Notes?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of users who&apos;ve supercharged their note-taking with AI. Start free today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-purple-600 rounded-xl hover:bg-blue-50 transition-all font-semibold text-lg shadow-xl hover:scale-105"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all font-semibold text-lg border border-white/20 hover:scale-105"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-background-surface border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-foreground">ExpandNote</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-foreground-secondary">
              <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>

            <p className="text-sm text-foreground-secondary">
              &copy; {new Date().getFullYear()} ExpandNote. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  title,
  description,
  color,
  theme,
  icon
}: {
  title: string;
  description: string;
  color: string;
  theme: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="group p-8 rounded-3xl border transition-all duration-300 hover:shadow-lg"
      style={{
        backgroundColor: theme === 'dark' ? `${color}10` : `${color}08`,
        borderColor: theme === 'dark' ? `${color}30` : `${color}20`
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
        style={{
          backgroundColor: theme === 'dark' ? `${color}25` : `${color}15`
        }}
      >
        <svg className="w-6 h-6" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">
        {title}
      </h3>
      <p className="text-foreground-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}
