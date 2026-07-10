import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const FEEDBACK_FILE = path.join(process.cwd(), 'docs', 'feedback-submissions.json');

interface FeedbackEntry {
  rating: number;
  wouldRecommend: string;
  comments: string;
  submittedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rating, wouldRecommend, comments } = body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be a number between 1 and 5.' }, { status: 400 });
    }
    if (typeof wouldRecommend !== 'string' || !wouldRecommend) {
      return NextResponse.json({ error: 'wouldRecommend is required.' }, { status: 400 });
    }

    const entry: FeedbackEntry = {
      rating,
      wouldRecommend,
      comments: typeof comments === 'string' ? comments.slice(0, 1000) : '',
      submittedAt: new Date().toISOString(),
    };

    let entries: FeedbackEntry[] = [];
    try {
      const existing = await fs.readFile(FEEDBACK_FILE, 'utf-8');
      entries = JSON.parse(existing);
    } catch {
      entries = [];
    }

    entries.push(entry);
    await fs.mkdir(path.dirname(FEEDBACK_FILE), { recursive: true });
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify(entries, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to save feedback:', err);
    return NextResponse.json({ error: 'Failed to save feedback.' }, { status: 500 });
  }
}
