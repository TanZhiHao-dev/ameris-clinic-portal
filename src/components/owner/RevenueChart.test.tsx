// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { RevenueChart } from './RevenueChart'

type Point = { label: string; value: number }
const asData = (v: unknown) => v as Point[]

// No SVG coordinate attribute should ever contain a non-finite value — one NaN
// or Infinity corrupts the entire <path>/<circle> and the chart renders blank.
const expectAllFiniteCoords = (html: string) => {
  expect(html).not.toContain('NaN')
  expect(html).not.toContain('Infinity')
}

afterEach(() => cleanup())

describe('RevenueChart hardening', () => {
  it('does not throw on an undefined data prop', () => {
    expect(() => render(<RevenueChart data={asData(undefined)} />)).not.toThrow()
  })

  it('does not throw on a null data prop', () => {
    expect(() => render(<RevenueChart data={asData(null)} />)).not.toThrow()
  })

  it('shows the empty-data message for [] when not loading', () => {
    const { container } = render(<RevenueChart data={[]} />)
    expect(container.textContent).toContain('Belum ada data pendapatan')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('shows the loading message for [] when loading', () => {
    const { container } = render(<RevenueChart data={[]} loading />)
    expect(container.textContent).toContain('Memuat data')
  })

  it('shows an insufficient-data message for a single point (no divide-by-zero)', () => {
    const { container } = render(<RevenueChart data={[{ label: 'Sen', value: 2_100_000 }]} />)
    expect(container.textContent).toContain('Belum cukup data')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders finite coordinates when all values are zero (no 0/0 NaN)', () => {
    const data: Point[] = [
      { label: 'Sen', value: 0 },
      { label: 'Sel', value: 0 },
      { label: 'Rab', value: 0 },
    ]
    const { container } = render(<RevenueChart data={data} />)
    expect(container.querySelector('svg')).not.toBeNull()
    expectAllFiniteCoords(container.innerHTML)
  })

  it('renders finite coordinates for all-negative values', () => {
    const data: Point[] = [
      { label: 'Sen', value: -500 },
      { label: 'Sel', value: -1200 },
      { label: 'Rab', value: -300 },
    ]
    const { container } = render(<RevenueChart data={data} />)
    expect(container.querySelector('svg')).not.toBeNull()
    expectAllFiniteCoords(container.innerHTML)
  })

  it('renders finite coordinates for mixed-sign values', () => {
    const data: Point[] = [
      { label: 'Sen', value: -800 },
      { label: 'Sel', value: 0 },
      { label: 'Rab', value: 1500 },
    ]
    const { container } = render(<RevenueChart data={data} />)
    expect(container.querySelector('svg')).not.toBeNull()
    expectAllFiniteCoords(container.innerHTML)
  })

  it('sanitizes NaN/Infinity/null values to finite coordinates', () => {
    const data = asData([
      { label: 'Sen', value: Number.NaN },
      { label: 'Sel', value: Number.POSITIVE_INFINITY },
      { label: 'Rab', value: null },
      { label: 'Kam', value: 4_200_000 },
    ])
    const { container } = render(<RevenueChart data={data} />)
    expect(container.querySelector('svg')).not.toBeNull()
    expectAllFiniteCoords(container.innerHTML)
  })

  it('renders the normal 7-day series with finite coordinates and all labels', () => {
    const data: Point[] = [
      { label: 'Sen', value: 2_100_000 }, { label: 'Sel', value: 3_400_000 },
      { label: 'Rab', value: 1_800_000 }, { label: 'Kam', value: 4_200_000 },
      { label: 'Jum', value: 3_050_000 }, { label: 'Sab', value: 6_300_000 },
      { label: 'Min', value: 2_700_000 },
    ]
    const { container } = render(<RevenueChart data={data} />)
    expect(container.querySelector('svg')).not.toBeNull()
    expectAllFiniteCoords(container.innerHTML)
    for (const p of data) expect(container.textContent).toContain(p.label)
  })

  it('survives duplicate labels (stable keys, no crash)', () => {
    const data: Point[] = [
      { label: 'Jan', value: 10 },
      { label: 'Jan', value: 20 },
      { label: 'Jan', value: 15 },
    ]
    expect(() => render(<RevenueChart data={data} />)).not.toThrow()
  })
})
