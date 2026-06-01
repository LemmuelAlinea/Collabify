export function getSessionUser(req, res) {
  res.json({
    user: {
      id: req.auth.appUser.id,
      email: req.auth.appUser.email,
      role: req.auth.appUser.role,
      isActive: req.auth.appUser.is_active,
    },
    profile: {
      id: req.auth.profile.id,
      firstName: req.auth.profile.first_name,
      lastName: req.auth.profile.last_name,
      displayName: req.auth.profile.display_name,
      avatarUrl: req.auth.profile.avatar_url,
      program: req.auth.profile.program,
      department: req.auth.profile.department,
      yearLevel: req.auth.profile.year_level,
      section: req.auth.profile.section,
      subjectSpecialization: req.auth.profile.subject_specialization,
      bio: req.auth.profile.bio,
    },
  })
}
