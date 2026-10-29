"""
Abstract Base Policy Interface for EVOLVE
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Tuple, Optional


class Policy(ABC):
    @abstractmethod
    def select(
        self,
        context: List[float],
        unmasked_arms: List[str],
        category: str = "performance",
        seed: Optional[int] = None
    ) -> Tuple[str, float, Dict[str, Dict[str, float]]]:
        """
        Select an arm from unmasked arms given context vector.
        Returns: (chosen_arm, propensity, scores_dict)
        """
        pass

    @abstractmethod
    def update(
        self,
        context: List[float],
        arm: str,
        reward: float,
        category: str = "performance",
        experiment_id: Optional[str] = None
    ) -> bool:
        """
        Update policy parameters with observed reward.
        Returns True if update was applied, False if skipped (e.g. duplicate).
        """
        pass

    @abstractmethod
    def state(self) -> Dict[str, Any]:
        """Serialize policy state to dictionary."""
        pass

    @abstractmethod
    def load(self, state_dict: Dict[str, Any]) -> None:
        """Load policy state from dictionary."""
        pass

    @abstractmethod
    def rebuild(self, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Replay rows in order and rebuild state deterministically."""
        pass
