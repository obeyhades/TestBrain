import { createBrowserRouter, redirect } from 'react-router';
import { AppLayout } from './layouts/AppLayout';
import { ProjectLayout, projectLayoutLoader } from './layouts/ProjectLayout';
import { LoginPage, loginAction, loginPageLoader } from './features/auth/LoginPage';
import { RegisterPage, registerAction, registerPageLoader } from './features/auth/RegisterPage';
import { logoutAction } from './features/auth/logout';
import { requireUser } from './features/auth/requireUser';
import { MembersPage, membersAction, membersLoader } from './features/projects/MembersPage';
import { ProjectOverviewPage } from './features/projects/ProjectOverviewPage';
import { ProjectsPage, projectsAction, projectsLoader } from './features/projects/ProjectsPage';
import {
  RequirementDetailPage,
  requirementAction,
  requirementLoader,
} from './features/requirements/RequirementDetailPage';
import {
  RequirementsPage,
  requirementsAction,
  requirementsLoader,
} from './features/requirements/RequirementsPage';
import {
  CreateUserPage,
  createUserAction,
  createUserLoader,
} from './features/users/CreateUserPage';

/**
 * The whole route tree in one readable place.
 *
 * A route declares which component renders, which loader fetches its data before
 * that component is shown, and which action handles its form submissions.
 *
 * Everything below the layout route is behind requireUser, so a new signed-in page
 * is added as a child and is protected without any further work.
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    loader: loginPageLoader,
    action: loginAction,
  },
  {
    path: '/register',
    element: <RegisterPage />,
    loader: registerPageLoader,
    action: registerAction,
  },
  {
    path: '/logout',
    action: logoutAction,
  },
  {
    element: <AppLayout />,
    loader: requireUser,
    children: [
      {
        path: '/',
        loader: () => redirect('/projects'),
      },
      {
        path: '/projects',
        element: <ProjectsPage />,
        loader: projectsLoader,
        action: projectsAction,
      },
      {
        path: '/projects/:projectId',
        element: <ProjectLayout />,
        loader: projectLayoutLoader,
        children: [
          {
            index: true,
            element: <ProjectOverviewPage />,
          },
          {
            path: 'requirements',
            element: <RequirementsPage />,
            loader: requirementsLoader,
            action: requirementsAction,
          },
          {
            path: 'requirements/:requirementId',
            element: <RequirementDetailPage />,
            loader: requirementLoader,
            action: requirementAction,
          },
          {
            path: 'members',
            element: <MembersPage />,
            loader: membersLoader,
            action: membersAction,
          },
        ],
      },
      {
        path: '/users/new',
        element: <CreateUserPage />,
        loader: createUserLoader,
        action: createUserAction,
      },
    ],
  },
]);
