#!/usr/bin/env python3
"""
Setup script for Phase 2 RAG Pipeline.

This script helps you get started with the RAG pipeline.
"""

import os
import sys
import subprocess

def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version.split()[0]} detected")
    return True

def check_env_file():
    """Check if .env file exists and has API key."""
    if not os.path.exists(".env"):
        print("❌ .env file not found")
        print("💡 Copy env.example to .env and add your OpenAI API key")
        return False
    
    with open(".env", "r") as f:
        content = f.read()
        if "your_openai_api_key_here" in content:
            print("⚠️ Please update .env with your actual OpenAI API key")
            return False
    
    print("✅ .env file configured")
    return True

def install_dependencies():
    """Install required dependencies."""
    print("📦 Installing dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        return False

def check_phase1_data():
    """Check if Phase 1 data is available."""
    if not os.path.exists("data/resume_points.txt"):
        print("❌ Phase 1 data not found")
        print("💡 Make sure you've copied the data from Phase 1")
        return False
    
    print("✅ Phase 1 data found")
    return True

def main():
    """Main setup function."""
    print("🚀 Setting up AI Resume Optimizer - Phase 2 RAG Pipeline")
    print("=" * 60)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Check .env file
    if not check_env_file():
        print("\n📝 To fix this:")
        print("1. Copy env.example to .env")
        print("2. Add your OpenAI API key to .env")
        print("3. Run this script again")
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Check Phase 1 data
    if not check_phase1_data():
        print("\n📝 To fix this:")
        print("1. Make sure you're in the phase2 directory")
        print("2. Copy data from Phase 1 if needed")
        sys.exit(1)
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Start the server: uvicorn app.main:app --reload")
    print("2. Visit http://localhost:8000/docs to see the API")
    print("3. Test with: python test_rag.py")
    print("\n🚀 Happy coding!")

if __name__ == "__main__":
    main()


