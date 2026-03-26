import Link from 'next/link';

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-800">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-white text-center mb-2">Pool Rules</h1>
        <p className="text-green-300 text-center mb-8">89th Masters Tournament · April 9–13, 2026</p>

        {/* Payment Banner */}
        <div className="bg-green-700 border border-green-500 rounded-xl p-6 mb-8 text-center">
          <p className="text-green-200 text-sm uppercase tracking-widest mb-1">Entry Fee</p>
          <p className="text-5xl font-bold text-white mb-3">$20</p>
          <p className="text-green-200 text-sm mb-1">Send payment via Venmo to</p>
          <p className="text-2xl font-semibold text-yellow-300">@test-venmo</p>
          <p className="text-green-300 text-xs mt-2">Deadline: 7 PM CT · Wednesday, April 8th</p>
        </div>

        {/* Entry & Payment */}
        <section className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-3">Entry &amp; Payment</h2>
          <ul className="space-y-2 text-green-100 text-sm">
            <li>• Entry fee is <strong className="text-white">$20 per team</strong></li>
            <li>• Send payment via Venmo to <strong className="text-yellow-300">@test-venmo</strong> before the deadline</li>
            <li>• Deadline to submit your picks: <strong className="text-white">7 PM CT on Wednesday, April 8th</strong></li>
            <li>• Late or unpaid entries will not be accepted</li>
          </ul>
        </section>

        {/* How It Works */}
        <section className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-3">How It Works</h2>
          <ul className="space-y-2 text-green-100 text-sm">
            <li>• Pick <strong className="text-white">one golfer from each of the 6 tiers</strong> to form your team</li>
            <li>• Your team score = the combined 4-round total of all 6 golfers</li>
            <li>• <strong className="text-white">Lowest score wins</strong> (this is golf!)</li>
            <li>• Also guess the <strong className="text-white">winning score</strong> — used as a tiebreaker</li>
            <li>• Multiple entries allowed — each costs an additional $20</li>
          </ul>
        </section>

        {/* Scoring Rules */}
        <section className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-3">Scoring Rules</h2>
          <ul className="space-y-2 text-green-100 text-sm">
            <li>• <strong className="text-white">Missed Cut:</strong> A golfer who misses the cut will have their 36-hole score frozen. They will not receive scores for the weekend rounds.</li>
            <li>• <strong className="text-white">Withdrawal / DQ after teeing off Thursday:</strong> The entire team is disqualified.</li>
            <li>• <strong className="text-white">Withdrawal before Thursday's first tee shot:</strong> You may substitute a golfer within the same tier, subject to commissioner approval.</li>
          </ul>
        </section>

        {/* Tiebreakers */}
        <section className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-3">Tiebreakers</h2>
          <p className="text-green-200 text-sm mb-3">If two or more teams finish with the same score, tiebreakers are applied in this order:</p>
          <ol className="space-y-2 text-green-100 text-sm list-none">
            <li className="flex gap-3"><span className="text-yellow-300 font-bold">1.</span> Closest guess to the tournament winner's final score</li>
            <li className="flex gap-3"><span className="text-yellow-300 font-bold">2.</span> Lowest score from Tier 6 golfer</li>
            <li className="flex gap-3"><span className="text-yellow-300 font-bold">3.</span> Lowest score from Tier 3 golfer</li>
            <li className="flex gap-3"><span className="text-yellow-300 font-bold">4.</span> Lowest score from Tier 4 golfer</li>
            <li className="flex gap-3"><span className="text-yellow-300 font-bold">5.</span> Prize split equally among remaining tied teams</li>
          </ol>
        </section>

        {/* Payouts */}
        <section className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-3">Payouts</h2>
          <p className="text-green-200 text-sm mb-4">Payouts scale with the number of entries. Final amounts announced once all entries are confirmed.</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-yellow-500/20 rounded-lg p-3">
              <p className="text-yellow-300 text-2xl font-bold">🥇</p>
              <p className="text-white font-semibold">1st Place</p>
              <p className="text-green-200 text-xs mt-1">~60% of pot</p>
            </div>
            <div className="bg-gray-400/20 rounded-lg p-3">
              <p className="text-gray-300 text-2xl font-bold">🥈</p>
              <p className="text-white font-semibold">2nd Place</p>
              <p className="text-green-200 text-xs mt-1">~25% of pot</p>
            </div>
            <div className="bg-amber-700/20 rounded-lg p-3">
              <p className="text-amber-600 text-2xl font-bold">🥉</p>
              <p className="text-white font-semibold">3rd Place</p>
              <p className="text-green-200 text-xs mt-1">~15% of pot</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link
            href="/submit"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold py-3 px-8 rounded-full text-lg transition-colors"
          >
            Submit Your Entry →
          </Link>
        </div>
      </div>
    </div>
  );
}
