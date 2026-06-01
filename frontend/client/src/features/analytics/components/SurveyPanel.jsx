import { useState } from 'react'
import { getSurvey, submitSurveyAnswers } from '../services/analyticsService'

export function SurveyPanel() {
  const [form, setForm] = useState({ projectId: '', groupId: '' })
  const [survey, setSurvey] = useState(null)
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')

  async function loadSurvey(event) {
    event.preventDefault()
    setError('')
    try {
      setSurvey(await getSurvey(form.projectId, form.groupId))
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      await submitSurveyAnswers({
        projectId: form.projectId,
        groupId: form.groupId,
        questionSetId: survey.questionSet.id,
        answers: Object.entries(answers).map(([questionId, answerValue]) => ({ questionId, answerValue })),
      })
      setSurvey({ ...survey, available: false, alreadyAnswered: true })
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  return (
    <section className="analytics-panel">
      <h3>Post-Project Learning Evaluation</h3>
      {error ? <p className="form-error">{error}</p> : null}
      <form className="analytics-form" onSubmit={loadSurvey}>
        <input value={form.projectId} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))} placeholder="Project ID" required />
        <input value={form.groupId} onChange={(event) => setForm((current) => ({ ...current, groupId: event.target.value }))} placeholder="Group ID" required />
        <button className="secondary-button" type="submit">Check survey</button>
      </form>
      {survey?.available ? (
        <form className="analytics-form" onSubmit={submit}>
          {survey.questionSet.questions.map((question) => (
            <label className="form-field" key={question.id}>
              <span>{question.prompt}</span>
              {question.questionType === 'rating_scale' ? (
                <input type="number" min="1" max="5" required onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: Number(event.target.value) }))} />
              ) : (
                <textarea required={question.isRequired} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} />
              )}
            </label>
          ))}
          <button className="primary-button" type="submit">Submit evaluation</button>
        </form>
      ) : null}
      {survey && !survey.available ? <p className="muted-text">{survey.alreadyAnswered ? 'Evaluation already submitted.' : 'Evaluation is not available yet.'}</p> : null}
    </section>
  )
}
