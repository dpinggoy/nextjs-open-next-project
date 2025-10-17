import { render, screen } from '@testing-library/react'
import Page from '../page'

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Page />)
    expect(screen.getByRole('heading', { name: /Next\.js on AWS/i })).toBeInTheDocument()
  })

  it('renders deployment message', () => {
    render(<Page />)
    expect(screen.getByText(/Successfully deployed with AWS CDK \+ OpenNext!/i)).toBeInTheDocument()
  })

  it('renders environment info', () => {
    render(<Page />)
    expect(screen.getByText(/Environment:/i)).toBeInTheDocument()
  })

  it('renders features section', () => {
    render(<Page />)
    expect(screen.getByText(/Features:/i)).toBeInTheDocument()
    expect(screen.getByText(/Server-Side Rendering/i)).toBeInTheDocument()
    expect(screen.getByText(/API Routes/i)).toBeInTheDocument()
  })
})