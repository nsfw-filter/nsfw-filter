import { Checkbox, Input, Segmented, Select, Slider, Switch } from 'antd'
import { ChevronDown, ChevronUp, Contrast, Droplet, EyeOff } from 'lucide-react'
import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { setFilterStrictness } from '../../redux/actions/settings'
import {
  setTrainedModel,
  setFilterEffect,
  setWebsiteList,
  toggleEnabled,
  toggleLogging
} from '../../redux/actions/settings/index'
import { RootState } from '../../redux/reducers'
import { SettingsState } from '../../redux/reducers/settings'
import { StatisticsState } from '../../redux/reducers/statistics'

import {
  Container,
  Stat,
  StatNumber,
  StatCaption,
  PowerRow,
  PowerText,
  PowerTitle,
  PowerHint,
  Card,
  Field,
  EffectField,
  FieldHead,
  FieldLabel,
  FieldValue,
  SliderEnds,
  AdvancedToggle,
  AdvancedPanel,
  AdvancedRow
} from './styles'

export const Production: React.FC = () => {
  const dispatch = useDispatch()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const {
    enabled,
    filterStrictness,
    trainedModel,
    filterEffect,
    websites,
    logging
  } = useSelector<RootState>((state) => state.settings) as SettingsState
  const { totalBlocked } = useSelector<RootState>((state) => state.statistics) as StatisticsState

  return (
    <Container>
      <Stat>
        <StatNumber>{totalBlocked.toLocaleString()}</StatNumber>
        <StatCaption>images blocked</StatCaption>
      </Stat>

      <PowerRow>
        <PowerText>
          <PowerTitle>Protection</PowerTitle>
          <PowerHint>{enabled ? 'On. Reload open tabs to apply changes' : 'Paused. Reload open tabs to apply changes'}</PowerHint>
        </PowerText>
        <Switch checked={enabled} onChange={() => dispatch(toggleEnabled())} />
      </PowerRow>

      <Card>
        <Field>
          <FieldHead>
            <FieldLabel>Filter strictness</FieldLabel>
            <FieldValue>{filterStrictness}%</FieldValue>
          </FieldHead>
          <Slider
            min={1}
            max={100}
            value={filterStrictness}
            tooltip={{ open: false }}
            onChange={(value: number) => dispatch(setFilterStrictness(value))}
          />
          <SliderEnds>
            <span>Lenient</span>
            <span>Strict</span>
          </SliderEnds>
        </Field>

        <EffectField>
          <FieldLabel>Filter effect</FieldLabel>
          <Segmented<'blur' | 'grayscale' | 'hide'>
            block
            style={{ marginTop: 8 }}
            value={filterEffect}
            onChange={value => dispatch(setFilterEffect(value))}
            options={[
              { label: 'Blur', value: 'blur', icon: <Droplet size={14} /> },
              { label: 'Gray', value: 'grayscale', icon: <Contrast size={14} /> },
              { label: 'Hide', value: 'hide', icon: <EyeOff size={14} /> }
            ]}
          />
        </EffectField>

        <Field>
          <FieldLabel>Allowed sites</FieldLabel>
          <Input
            style={{ marginTop: 8 }}
            placeholder="twitter.com, facebook.com"
            defaultValue={websites.join(', ')}
            onChange={event => dispatch(setWebsiteList(event.target.value.split(/\s*,\s*/).filter(Boolean)))}
          />
        </Field>
      </Card>

      <div>
        <AdvancedToggle
          aria-expanded={advancedOpen}
          aria-controls="advanced-panel"
          onClick={() => setAdvancedOpen(open => !open)}
        >
          {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Advanced
        </AdvancedToggle>
        {advancedOpen && (
          <AdvancedPanel id="advanced-panel">
            <AdvancedRow>
              <FieldLabel>Trained model</FieldLabel>
              <Select
                value={trainedModel}
                style={{ width: 150 }}
                onChange={value => dispatch(setTrainedModel(value))}
                options={[{ value: trainedModel, label: trainedModel }]}
              />
            </AdvancedRow>
            <Checkbox checked={logging} onChange={() => dispatch(toggleLogging())}>
              Show logs in browser console
            </Checkbox>
          </AdvancedPanel>
        )}
      </div>
    </Container>
  )
}
