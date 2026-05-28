import http from './http'

export interface ProjectOverview {
  project_code_lines: number
}

export const overviewApi = {
  getOverview: (): Promise<ProjectOverview> => http.get('/overview'),
}
