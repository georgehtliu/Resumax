"""
Test runner script for comprehensive endpoint tests.

This script runs all tests for the selection and optimization endpoints.
"""

import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_tests():
    """Run all tests."""
    print("🧪 Running comprehensive tests for /select and /optimize endpoints...")
    print("=" * 70)
    
    # Run tests with verbose output
    pytest.main([
        __file__.replace("test_runner.py", ""),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "not slow"  # Skip slow tests by default
    ])


if __name__ == "__main__":
    run_tests()

