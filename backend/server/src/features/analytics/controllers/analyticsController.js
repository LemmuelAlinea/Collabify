import {
  compareProjects,
  createQuestion,
  createQuestionSet,
  exportAnalyticsReport,
  getAnalyticsDashboard,
  getAvailableSurvey,
  listQuestionSets,
  submitSurveyAnswers,
  updateQuestion,
  updateQuestionSet,
} from '../services/analyticsService.js'

export async function getQuestionSets(req, res, next) {
  try {
    res.json({ questionSets: await listQuestionSets(req.auth.user.id, req.auth.role, req.query.classId) })
  } catch (error) {
    next(error)
  }
}

export async function postQuestionSet(req, res, next) {
  try {
    res.status(201).json({ questionSet: await createQuestionSet(req.auth.user.id, req.body) })
  } catch (error) {
    next(error)
  }
}

export async function patchQuestionSet(req, res, next) {
  try {
    res.json({ questionSet: await updateQuestionSet(req.auth.user.id, req.params.id, req.body) })
  } catch (error) {
    next(error)
  }
}

export async function postQuestion(req, res, next) {
  try {
    res.status(201).json({ question: await createQuestion(req.auth.user.id, req.body) })
  } catch (error) {
    next(error)
  }
}

export async function patchQuestion(req, res, next) {
  try {
    res.json({ question: await updateQuestion(req.auth.user.id, req.params.id, req.body) })
  } catch (error) {
    next(error)
  }
}

export async function getSurvey(req, res, next) {
  try {
    res.json({ survey: await getAvailableSurvey(req.auth.user.id, req.auth.role, req.query.projectId, req.query.groupId) })
  } catch (error) {
    next(error)
  }
}

export async function postSurveyAnswers(req, res, next) {
  try {
    res.status(201).json({ result: await submitSurveyAnswers(req.auth.user.id, req.body) })
  } catch (error) {
    next(error)
  }
}

export async function getDashboard(req, res, next) {
  try {
    res.json({ analytics: await getAnalyticsDashboard(req.auth.user.id, req.auth.role, req.query) })
  } catch (error) {
    next(error)
  }
}

export async function postCompareProjects(req, res, next) {
  try {
    res.json({ comparison: await compareProjects(req.auth.user.id, req.auth.role, req.body) })
  } catch (error) {
    next(error)
  }
}

export async function postExportReport(req, res, next) {
  try {
    const report = await exportAnalyticsReport(req.auth.user.id, req.auth.role, req.body)
    res.json({ report })
  } catch (error) {
    next(error)
  }
}
