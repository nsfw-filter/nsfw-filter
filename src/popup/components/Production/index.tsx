import Slider from 'antd/lib/slider'
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { setFilterStrictness } from '../../redux/actions/settings'
import { RootState } from '../../redux/reducers'
import { SettingsState } from '../../redux/reducers/settings'
import { StatisticsState } from '../../redux/reducers/statistics'

import { Container, Stats } from './styles'

export const Production: React.FC = () => {
  const dispatch = useDispatch()
  const { filterStrictness } = useSelector<RootState>((state) => state.settings) as SettingsState
  const { totalBlocked } = useSelector<RootState>((state) => state.statistics) as StatisticsState

  return (
    <Container>
      <Stats>
        <span>Total blocked: {totalBlocked}</span>
      </Stats>

      <div>Filter Strictness</div>
      <Slider
        min={20}
        max={100}
        onChange={(value: number) => dispatch(setFilterStrictness(value))}
        value={filterStrictness}
      />

    </Container>
  )
}
