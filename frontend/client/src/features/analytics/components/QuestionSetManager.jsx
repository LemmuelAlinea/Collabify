import { useEffect, useState } from 'react'
import {
  createQuestion,
  createQuestionSet,
  getQuestionSets,
  updateQuestionSet,
} from '../services/analyticsService'

export function QuestionSetManager() {
  const [sets, setSets] = useState([])
  const [activeSetId, setActiveSetId] = useState('')
  const [setForm, setSetForm] = useState({ title: '', description: '' })
  const [questionForm, setQuestionForm] = useState({ prompt: '', questionType: 'rating_scale' })
  const [error, setError] = useState('')

  async function loadSets() {
    setSets(await getQuestionSets())
  }

  useEffect(() => {
    loadSets().catch((loadError) => setError(loadError.message))
  }, [])

  async function saveSet(event) {
    event.preventDefault()
    setError('')
    try {
      const next = await createQuestionSet(setForm)
      setSets((current) => [next, ...current])
      setActiveSetId(next.id)
      setSetForm({ title: '', description: '' })
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function saveQuestion(event) {
    event.preventDefault()
    setError('')
    try {
      await createQuestion({ ...questionForm, questionSetId: activeSetId, options: [], position: 0, isRequired: true })
      await loadSets()
      setQuestionForm({ prompt: '', questionType: 'rating_scale' })
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function archiveSet(id) {
    await updateQuestionSet(id, { isArchived: true })
    setSets((current) => current.filter((set) => set.id !== id))
  }

  return (
    <section className="analytics-panel">
      <h3>Learning Evaluation Questions</h3>
      {error ? <p className="form-error">{error}</p> : null}
      <form className="analytics-form" onSubmit={saveSet}>
        <input value={setForm.title} onChange={(event) => setSetForm((current) => ({ ...current, title: event.target.value }))} placeholder="Question set title" required />
        <input value={setForm.description} onChange={(event) => setSetForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
        <button className="primary-button" type="submit">Create set</button>
      </form>
      <div className="analytics-list">
        {sets.map((set) => (
          <article className="analytics-row" key={set.id}>
            <button type="button" onClick={() => setActiveSetId(set.id)}>{set.title}</button>
            <span>{set.questions.length} questions</span>
            <button type="button" onClick={() => archiveSet(set.id)}>Archive</button>
          </article>
        ))}
      </div>
      {activeSetId ? (
        <form className="analytics-form" onSubmit={saveQuestion}>
          <input value={questionForm.prompt} onChange={(event) => setQuestionForm((current) => ({ ...current, prompt: event.target.value }))} placeholder="Question" required />
          <select value={questionForm.questionType} onChange={(event) => setQuestionForm((current) => ({ ...current, questionType: event.target.value }))}>
            <option value="rating_scale">Rating scale</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="short_answer">Short answer</option>
            <option value="long_answer">Long answer</option>
          </select>
          <button className="secondary-button" type="submit">Add question</button>
        </form>
      ) : null}
    </section>
  )
}
