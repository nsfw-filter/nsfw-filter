import styled from 'styled-components'

export const Wrap = styled.div`
  margin: 0 auto;
  max-width: 560px;
  padding: 48px 24px 64px;
`

export const Title = styled.h1`
  color: ${props => props.theme.text.primary};
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0;
`

export const Sub = styled.p`
  color: ${props => props.theme.text.secondary};
  font-size: 14px;
  line-height: 1.5;
  margin: 8px 0 24px;
`

export const AddRow = styled.form`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
`

export const ListCard = styled.div`
  background-color: ${props => props.theme.bg.surface};
  border: 1px solid ${props => props.theme.border};
  border-radius: 12px;
  overflow: hidden;
`

export const Row = styled.div`
  align-items: center;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;

  &:first-child {
    border-top: none;
  }
`

export const Host = styled.span`
  color: ${props => props.theme.text.primary};
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const Remove = styled.button`
  align-items: center;
  background: none;
  border: none;
  color: ${props => props.theme.text.secondary};
  cursor: pointer;
  display: flex;
  padding: 4px;

  &:hover {
    color: ${props => props.theme.accent};
  }
`

export const EmptyNote = styled.div`
  color: ${props => props.theme.text.secondary};
  font-size: 14px;
  padding: 24px 16px;
  text-align: center;
`
