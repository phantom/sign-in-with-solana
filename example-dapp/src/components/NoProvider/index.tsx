import React from 'react';
import styled from 'styled-components';

import { REACT_GRAY } from '../../constants';

// =============================================================================
// Styled Components
// =============================================================================

const StyledMain = styled.main`
  padding: 20px;
  height: 100vh;
  background-color: ${REACT_GRAY};
`;

// =============================================================================
// Main Component
// =============================================================================

// TODO: @PHANTOM-TEAM: Let's improve this UI
const NoProvider = () => {
  return (
    <StyledMain>
      <h2>Could not find a provider</h2>
    </StyledMain>
  );
};

export default NoProvider;
