import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/ai-executions
 * Fetch AI execution logs for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get limit from query params (default 100, max 500)
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '100'), 500);

    // Fetch execution logs with related profile and note info
    const { data: executions, error } = await supabase
      .from('ai_executions')
      .select(`
        *,
        ai_profiles (
          id,
          name,
          ai_provider,
          model
        ),
        notes (
          id,
          title
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching AI executions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch execution logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: executions || [] });
  } catch (error) {
    console.error('Error in GET /api/ai-executions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
