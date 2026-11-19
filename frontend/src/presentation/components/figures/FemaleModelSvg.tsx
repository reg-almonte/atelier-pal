import type { FemaleBottomStyle } from '../../../domain/models';
import { FemaleSkirtSvg } from './FemaleSkirtSvg';
import { FemaleTrousersSvg } from './FemaleTrousersSvg';
import type { ModelFigureProps } from './types';

interface FemaleModelSvgProps extends ModelFigureProps {
  femaleStyle: FemaleBottomStyle;
}

export function FemaleModelSvg({ femaleStyle, ...figureProps }: FemaleModelSvgProps) {
  if (femaleStyle === 'skirt') {
    return <FemaleSkirtSvg {...figureProps} />;
  }
  return <FemaleTrousersSvg {...figureProps} />;
}
