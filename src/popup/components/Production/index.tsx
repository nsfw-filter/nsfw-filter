import 'antd/lib/select/style/index.css'
import 'antd/lib/slider/style/index.css'

import Select from 'antd/lib/select'
import Slider from 'antd/lib/slider'
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { setFilterStrictness } from '../../redux/actions/settings'
import {
  setTrainedModel,
  setFilterEffect
} from '../../redux/actions/settings/index'
import { RootState } from '../../redux/reducers'
import { SettingsState } from '../../redux/reducers/settings'
import { StatisticsState } from '../../redux/reducers/statistics'

import { Container, Stats, DropdownRow } from './styles'

const { Option } = Select

export const Production: React.FC = () => {
  const dispatch = useDispatch()
  const {
    filterStrictness,
    trainedModel,
    filterEffect
  } = useSelector<RootState>((state) => state.settings) as SettingsState
  const { totalBlocked } = useSelector<RootState>((state) => state.statistics) as StatisticsState

  return (
    <Container>
      <Stats>
        <span>Total blocked: {totalBlocked}</span>
      </Stats>

      <div>Filter Strictness</div>
      <Slider
        min={1}
        max={100}
        onChange={(value: number) => dispatch(setFilterStrictness(value))}
        value={filterStrictness}
      />

      <DropdownRow>
        <span>Filter effect</span>
        <Select
          defaultValue={filterEffect}
          style={{ width: 140 }}
          onChange={value => dispatch(setFilterEffect(value))}
        >
          <Option value="hide">Hide</Option>
          <Option value="blur">Blur</Option>
        </Select>
      </DropdownRow>

      <DropdownRow>
        <span>Trained model</span>
        <Select
          defaultValue={trainedModel}
          style={{ width: 140 }}
          onChange={value => dispatch(setTrainedModel(value))}
        >
          <Option value={trainedModel}>{trainedModel}</Option>
        </Select>
      </DropdownRow>

    </Container>
  )
}
