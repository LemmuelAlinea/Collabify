export function ContributionLeaderboard({ members }) {
  return (
    <div className="contribution-leaderboard">
      {members.map((member, index) => (
        <article className="leaderboard-row" key={member.userId}>
          <span>{index + 1}</span>
          <div>
            <strong>{member.displayName}</strong>
            <p>{member.contributionCount} events</p>
          </div>
          <strong>{member.points} pts</strong>
        </article>
      ))}
      {members.length === 0 ? <p>No member contributions yet.</p> : null}
    </div>
  )
}
